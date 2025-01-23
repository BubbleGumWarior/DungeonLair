import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { Router } from '@angular/router';
import { localIP } from '../config'; // Import the IP address
import DOMPurify from 'dompurify'; // Import DOMPurify
import { CommonModule } from '@angular/common'; // Import CommonModule

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [FormsModule, CommonModule] // Add CommonModule here
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  loginImageUrl: string = `https://${localIP}:8080/assets/images/LoginBackground.jpg`;
  isMobile: boolean = false;
  errorMessage: string | null = null;
  showModal: boolean = false; // Add this line

  constructor(private router: Router) {
    this.isMobile = window.innerWidth <= 768; // Detect if the device is mobile
  }

  onSubmit() {
    console.log('Login form submitted with email:', this.email);
    const sanitizedEmail = DOMPurify.sanitize(this.email);
    const sanitizedPassword = DOMPurify.sanitize(this.password);

    console.log('Sanitized email:', sanitizedEmail);
    console.log('Sanitized password:', sanitizedPassword);

    // Use fetch API to send login request
    fetch(`https://${localIP}:8080/login`, { // Change http to https
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: sanitizedEmail, password: sanitizedPassword })
    })
    .then(response => {
      console.log('Received response:', response);
      if (!response.ok) {
        throw new Error('Invalid credentials');
      }
      return response.json(); // Parse JSON response
    })
    .then(data => {
      // Log the response from the server
      console.log('Login successful, received data:', data);
      // Store the JWT token in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username); // Store username in localStorage
      localStorage.setItem('role', data.role); // Store role in localStorage
      localStorage.setItem('characterID', data.characterID); // Store characterID in localStorage
      this.navigateTo('/'); // Redirect to home or desired route
    })
    .catch(error => {
      console.error('Login error:', error);
      this.errorMessage = 'Invalid credentials';
      this.showModal = true; // Show modal on error
    });
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  closeModal(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal')) {
      this.showModal = false;
    }
  }
}
