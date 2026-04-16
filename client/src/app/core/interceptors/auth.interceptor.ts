import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const isApiRequest = req.url.startsWith(environment.apiUrl);

  let request = req;
  const token = authService.getToken();

  if (isApiRequest) {
    const headers: { [key: string]: string } = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    request = req.clone({
      setHeaders: headers,
      withCredentials: true
    });
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && isApiRequest && !req.url.endsWith('/auth/login') && !req.url.endsWith('/auth/register')) {
        authService.clearSession();
        router.navigate(['/login']);
      }

      return throwError(() => error);
    }),
  );
};
