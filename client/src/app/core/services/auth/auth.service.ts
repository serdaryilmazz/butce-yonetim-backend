import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { environment } from '../../../../environments/environment';

type AuthUser = {
  id: string;
  email: string;
};

type AuthResponse = {
  success: boolean;
  data: {
    user: AuthUser;
  };
};

type CurrentUserResponse = {
  success: boolean;
  data: AuthUser;
};

type LogoutResponse = {
  success: boolean;
  data: {
    message: string;
  };
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  public readonly currentUser = signal<AuthUser | null>(null);

  constructor(private http: HttpClient, private router: Router) {}

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        if (response.success) {
          this.currentUser.set(response.data.user);
        }
      }),
    );
  }

  register(userData: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, userData).pipe(
      tap((response) => {
        if (response.success) {
          this.currentUser.set(response.data.user);
        }
      }),
    );
  }

  fetchCurrentUser(): Observable<AuthUser> {
    return this.http.get<CurrentUserResponse>(`${this.apiUrl}/me`).pipe(
      map((response) => response.data),
      tap((user) => {
        this.currentUser.set(user);
      }),
    );
  }

  checkSession(): Observable<boolean> {
    if (this.currentUser()) {
      return of(true);
    }

    return this.fetchCurrentUser().pipe(
      map(() => true),
      catchError(() => {
        this.currentUser.set(null);
        return of(false);
      }),
    );
  }

  logout(): void {
    this.currentUser.set(null);
    this.http.post<LogoutResponse>(`${this.apiUrl}/logout`, {}).subscribe({
      next: () => {
        void this.router.navigate(['/login']);
      },
      error: () => {
        void this.router.navigate(['/login']);
      }
    });
  }

  clearSession(): void {
    this.currentUser.set(null);
  }
}
