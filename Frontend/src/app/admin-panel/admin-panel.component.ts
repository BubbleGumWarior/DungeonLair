import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { localIP } from '../config';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  isTemporaryPassword: boolean;
  temporaryPasswordExpires: string | null;
}

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css']
})
export class AdminPanelComponent implements OnInit {
  users: User[] = [];
  loading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  showModal = false;
  resetResult: any = null;

  constructor() {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    const token = localStorage.getItem('token');

    fetch(`https://${localIP}:443/admin/users`, {
      method: 'GET',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load users');
      }
      return response.json();
    })
    .then(data => {
      this.users = data;
      this.loading = false;
    })
    .catch(error => {
      this.errorMessage = `Error loading users: ${error.message}`;
      this.loading = false;
    });
  }

  resetPassword(userId: number, username: string) {
    if (!confirm(`Are you sure you want to reset the password for ${username}?`)) {
      return;
    }

    this.loading = true;
    const token = localStorage.getItem('token');

    fetch(`https://${localIP}:443/admin/reset-password`, {
      method: 'POST',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to reset password');
      }
      return response.json();
    })
    .then(data => {
      this.resetResult = data;
      this.successMessage = `Password reset successfully for ${data.username}`;
      this.showModal = true;
      this.loadUsers(); // Reload users to update temporary password status
      this.loading = false;
    })
    .catch(error => {
      this.errorMessage = `Error resetting password: ${error.message}`;
      this.loading = false;
    });
  }

  closeModal() {
    this.showModal = false;
    this.resetResult = null;
    this.successMessage = null;
    this.errorMessage = null;
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }
}
