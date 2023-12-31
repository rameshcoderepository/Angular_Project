import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, tap } from 'rxjs/operators';
import { throwError, BehaviorSubject } from 'rxjs';

import { User } from './user.model';

export interface AuthResponseData {
  kind: string;
  idToken: string;
  email: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  registered?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Create a BehaviorSubject with an initial value of null
  user = new BehaviorSubject<User>(null);
  private tokenExpirationTimer: any;

  constructor(private http: HttpClient, private router: Router) {}

  signup(email: string, password: string) {
    return this.http
      .post<AuthResponseData>(
        'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyDAmViYIiQ-MYwsEHA6sQQFYeIPvxg2AY4',
        {
          email: email,
          password: password,
          returnSecureToken: true
        },
        {

        }
      )
      .pipe(
        catchError(this.handleError),
        tap(resData => {
          this.handleAuthentication(
            resData.email,
            resData.localId,
            resData.idToken,
            +resData.expiresIn
          );
        })
      );
  }

// It uses the RxJS pipe operator to perform two operations on the observable returned by the HTTP POST request:
// catchError(this.handleError): This handles any errors that may occur during the HTTP request by passing them to the handleError method.
//  tap(resData => {...}): This performs a side effect when the HTTP request is successful. It calls the handleAuthentication method to process the response data.
  // This usage of tap is a common pattern in RxJS when you need to perform actions that are not directly related to the transformation or filtering of emitted values but are essential for handling the flow of your application, such as triggering authentication logic after a successful HTTP request.

  login(email: string, password: string) {
    return this.http
      .post<AuthResponseData>(
        'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDAmViYIiQ-MYwsEHA6sQQFYeIPvxg2AY4',
        {
          email: email,
          password: password,
          returnSecureToken: true
        }
      )
      .pipe(
        catchError(this.handleError),
        tap(resData => {
          this.handleAuthentication(
            resData.email,
            resData.localId,
            resData.idToken,
            +resData.expiresIn
          );
        })
      );
  }

// This method is responsible for automatically logging in a user based on data stored in local storage (e.g., after a page refresh).
// It attempts to retrieve user data from local storage and parses it into a structured format.
// If user data is found, it constructs a User object and emits it using this.user.next(loadedUser), effectively marking the user as authenticated.
// It calculates the expirationDuration based on the time remaining until the stored token expires and sets up an automatic logout timer accordingly.

  autoLogin() {
    const userData: {
      email: string;
      id: string;
      _token: string;
      _tokenExpirationDate: string;
    } = JSON.parse(localStorage.getItem('userData'));
    if (!userData) {
      return;
    }

    const loadedUser = new User(
      userData.email,
      userData.id,
      userData._token,
      new Date(userData._tokenExpirationDate)
    );

    if (loadedUser.token) {
      this.user.next(loadedUser);
      const expirationDuration =
        new Date(userData._tokenExpirationDate).getTime() -
        new Date().getTime();
      this.autoLogout(expirationDuration);
    }
  }

  logout() {
    this.user.next(null);
    this.router.navigate(['/auth']);
    localStorage.removeItem('userData');
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }
    this.tokenExpirationTimer = null;
  }
  

// This method is responsible for logging the user out of the application.
// It sets the user object (likely a BehaviorSubject) to null, effectively marking the user as not authenticated.
// It navigates the user to the authentication page (e.g., '/auth') using the Angular Router. This is where users can log in or sign up again.
// It removes the user data from local storage to log the user out persistently.
// It clears any existing token expiration timer to prevent further automatic logout.

  autoLogout(expirationDuration: number) {
    this.tokenExpirationTimer = setTimeout(() => {
      this.logout();
    }, expirationDuration);
  }

// This method is responsible for setting up an automatic logout timer based on the expirationDuration, which represents the time remaining until the user's token expires.
// It uses setTimeout to call the logout method after the specified expirationDuration in milliseconds. When the timer expires, the user is automatically logged out.

  private handleAuthentication(
    email: string,
    userId: string,
    token: string,
    expiresIn: number
  ) {
    const expirationDate = new Date(new Date().getTime() + expiresIn * 1000); // 12PM
    const user = new User(email, userId, token, expirationDate);
    this.user.next(user); // Emit the new user data to subscribers

    this.autoLogout(expiresIn * 1000);
    localStorage.setItem('userData', JSON.stringify(user));
  }

// This method is responsible for handling user authentication after a successful signup or login.
// It takes parameters such as email, userId, token, and expiresIn to construct a User object and manage user authentication.
// It calculates the expiration date of the token by adding expiresIn seconds to the current date and time.
// It creates a User object with the user's data and emits this user data using the next method on a BehaviorSubject (presumably named this.user) to notify subscribers about the user's authentication status.
// It sets up an auto-logout mechanism, which is likely used to automatically log the user out after a certain period of time (specified by expiresIn).
// It stores the user data in the browser's local storage using localStorage.setItem, which allows the user to stay logged in even if they refresh the page or reopen the browser.

  private handleError(errorRes: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (!errorRes.error || !errorRes.error.error) {
      return throwError(errorMessage);
    }
    switch (errorRes.error.error.message) {
      case 'EMAIL_EXISTS':
        errorMessage = 'This email exists already';
        break;
      case 'EMAIL_NOT_FOUND':
        errorMessage = 'This email does not exist.';
        break;
      case 'INVALID_PASSWORD':
        errorMessage = 'This password is not correct.';
        break;
    }
    return throwError(errorMessage);
  }
}
