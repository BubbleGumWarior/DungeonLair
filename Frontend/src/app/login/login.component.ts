import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [FormsModule] // Add FormsModule here
})
export class LoginComponent {
  email: string = '';
  password: string = '';

  constructor(private router: Router) {}

  onSubmit() {
    // Use fetch API to send login request
    fetch('http://102.182.41.110:3000/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: this.email, password: this.password })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Invalid credentials');
      }
      return response.json(); // Parse JSON response
    })
    .then(data => {
      // Log the response from the server
      console.log('Server response:', data);
      
      // Store the JWT token in localStorage
      localStorage.setItem('token', data.token);
      this.navigateTo('/'); // Redirect to home or desired route
    })
    .catch(error => {
      console.error('Login error:', error);
      // Optionally, display an error message to the user
    });
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }
}
