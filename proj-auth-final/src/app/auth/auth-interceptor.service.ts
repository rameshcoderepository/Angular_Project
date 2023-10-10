import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpParams
} from '@angular/common/http';
import { take, exhaustMap } from 'rxjs/operators';

import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptorService implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler) {

    //req: The incoming HTTP request.
    //next: The next HttpHandler in the request/response chain, which is responsible for actually sending the HTTP request.
   
    //Observable Chain (`this.authService.user.pipe(...)):
    // return this.authService.user.pipe(
    //   take(1),
    //   exhaustMap(user => {
    //     // ...
    //   })
    // );

    //The above code starts an observable chain using the pipe method. It begins with the this.authService.user observable, which represents the user's authentication status.
   
    //The take(1) operator ensures that only the first emission from this.authService.user is considered, effectively completing the observable after a single emission. This is used to get the current user (if available) and then unsubscribe.
   
    //The exhaustMap operator is used to switch to another observable (next.handle(...)) based on the previous observable's value (user).
    return this.authService.user.pipe(
      take(1),
      exhaustMap(user => {
        if (!user) {
          return next.handle(req);
        }
        const modifiedReq = req.clone({
          params: new HttpParams().set('auth', user.token)
        });
        return next.handle(modifiedReq);
      })
    );
  }
}

// If there is no user logged in (!user), the interceptor simply proceeds with the original request using next.handle(req).
// If a user is logged in, it creates a modified request (modifiedReq) by cloning the original request (req) and adding an authentication token as a query parameter.
// The modified request is then passed to next.handle(modifiedReq) to continue with the request/response chain.

//Angular HTTP interceptor, specifically an authentication interceptor. It intercepts outgoing HTTP requests and adds an authentication token to them if a user is logged in

// Finally this Angular HTTP interceptor checks if a user is logged in, and if so, it adds an authentication token to outgoing HTTP requests