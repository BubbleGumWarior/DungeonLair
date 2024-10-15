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
    localStorage.setItem('Email', this.email);
    localStorage.setItem('Password', this.password);

    this.navigateTo('/')
  }
  
  
  navigateTo(route: string) {
    this.router.navigate([route]);
  }
}
