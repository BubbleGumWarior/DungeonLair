import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { localIP } from '../config';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent implements OnInit {
  changePasswordForm: FormGroup;
  submitted = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  loading = false;
  isTemporaryLogin = false;
  expirationDate: string | null = null;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(private fb: FormBuilder, private router: Router) {
    this.changePasswordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.checkLoginStatus();
    this.isTemporaryLogin = localStorage.getItem('isTemporaryPassword') === 'true';
    this.expirationDate = localStorage.getItem('temporaryPasswordExpires');
  }

  checkLoginStatus() {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/auth']);
    }
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  get f() {
    return this.changePasswordForm.controls;
  }

  togglePasswordVisibility(field: string) {
    switch(field) {
      case 'current':
        this.showCurrentPassword = !this.showCurrentPassword;
        break;
      case 'new':
        this.showNewPassword = !this.showNewPassword;
        break;
      case 'confirm':
        this.showConfirmPassword = !this.showConfirmPassword;
        break;
    }
  }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = null;
    this.successMessage = null;

    if (this.changePasswordForm.invalid) {
      if (this.changePasswordForm.errors?.['passwordMismatch']) {
        this.errorMessage = 'New passwords do not match';
      } else if (this.f['newPassword'].errors?.['minlength']) {
        this.errorMessage = 'New password must be at least 6 characters long';
      } else {
        this.errorMessage = 'Please fill out all fields correctly';
      }
      return;
    }

    this.loading = true;
    const token = localStorage.getItem('token');

    fetch(`https://${localIP}:443/change-password`, {
      method: 'POST',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        currentPassword: this.changePasswordForm.value.currentPassword,
        newPassword: this.changePasswordForm.value.newPassword
      })
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(err => { throw new Error(err.message) });
      }
      return response.json();
    })
    .then(data => {
      this.successMessage = 'Password changed successfully!';
      this.loading = false;
      
      // Clear temporary password flags
      localStorage.removeItem('isTemporaryPassword');
      localStorage.removeItem('temporaryPasswordExpires');
      
      // Redirect to home after a delay
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 2000);
    })
    .catch(error => {
      this.errorMessage = error.message || 'Failed to change password';
      this.loading = false;
    });
  }

  navigateHome() {
    if (this.isTemporaryLogin) {
      if (confirm('You are using a temporary password. Are you sure you want to continue without changing it?')) {
        this.router.navigate(['/']);
      }
    } else {
      this.router.navigate(['/']);
    }
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  }
}
