import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  errorMessage = '';
  isSubmitting = false;
  readonly registerForm;

  constructor(private authService: AuthService, private router: Router, fb: FormBuilder) {
    this.registerForm = fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid || this.isSubmitting) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    this.authService.register(this.registerForm.getRawValue()).subscribe({
      next: () => {
        void this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.errorMessage = err.error?.data?.message || 'Kayıt başarısız.';
        this.isSubmitting = false;
      }
    });
  }
}
