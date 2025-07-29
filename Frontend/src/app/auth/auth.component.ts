import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { localIP } from '../config';
import DOMPurify from 'dompurify';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-auth',
  standalone: true,
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css'],
  imports: [ReactiveFormsModule, CommonModule, FormsModule]
})
export class AuthComponent implements OnInit {
  isLoginMode = true;
  isAnimating = false;
  
  // Login properties
  email: string = '';
  password: string = '';
  
  // Register properties
  registerForm: FormGroup;
  submitted = false;
  characterName: string = '';
  showCharacterNameModal: boolean = false;
  
  // Common properties
  loginImageUrl: string = `https://${localIP}:443/assets/images/LoginBackground.jpg`;
  isMobile: boolean = false;
  errorMessage: string | null = null;
  showModal: boolean = false;
  showPassword: boolean = false;
  showRegisterPassword: boolean = false;

  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute) {
    this.isMobile = window.innerWidth <= 768;
    this.registerForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['Player'],      
      characterName: "User"
    });
  }

  ngOnInit() {
    // Set initial mode based on route
    const path = this.route.snapshot.routeConfig?.path;
    if (path === 'register') {
      this.isLoginMode = false;
    } else {
      this.isLoginMode = true;
    }
  }

  get f() {
    return this.registerForm.controls;
  }

  toggleMode() {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    this.isLoginMode = !this.isLoginMode;
    
    // Reset animation state after animation completes
    setTimeout(() => {
      this.isAnimating = false;
    }, 800);
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleRegisterPasswordVisibility() {
    this.showRegisterPassword = !this.showRegisterPassword;
  }

  onLoginSubmit() {
    console.log('Login form submitted with email:', this.email);
    const sanitizedEmail = DOMPurify.sanitize(this.email);
    const sanitizedPassword = DOMPurify.sanitize(this.password);

    fetch(`https://${localIP}:443/login`, {
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
      return response.json();
    })
    .then(data => {
      console.log('Login successful:', data);
      // Store the JWT token with the correct keys matching the original components
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role);
      localStorage.setItem('characterID', data.characterID);
      // Also store character name if provided (for consistency)
      if (data.characterName) {
        localStorage.setItem('characterName', data.characterName);
      }
      
      // Check if this is a temporary password login
      if (data.isTemporaryPassword) {
        localStorage.setItem('isTemporaryPassword', 'true');
        localStorage.setItem('temporaryPasswordExpires', data.temporaryPasswordExpires);
        this.router.navigate(['/change-password']);
      } else {
        this.router.navigate(['/']);
      }
    })
    .catch(error => {
      console.error('Login error:', error);
      this.errorMessage = 'Invalid email or password. Please try again.';
      this.showModal = true;
    });
  }

  onRegisterSubmit(): void {
    this.submitted = true;
    this.errorMessage = null;
    console.log('Form submitted:', this.registerForm.value);

    if (this.registerForm.invalid) {
      if (this.f['email'].errors?.['email']) {
        this.errorMessage = 'Please enter a valid email address.';
      } else if (this.f['password'].errors?.['minlength']) {
        this.errorMessage = 'Password must be at least 6 characters long.';
      } else {
        this.errorMessage = 'Please fill in all required fields.';
      }
      this.showModal = true;
      return;
    }

    const formData = {
      username: DOMPurify.sanitize(this.registerForm.value.username),
      email: DOMPurify.sanitize(this.registerForm.value.email),
      password: DOMPurify.sanitize(this.registerForm.value.password),
      role: DOMPurify.sanitize(this.registerForm.value.role),
      characterName: DOMPurify.sanitize(this.registerForm.value.characterName),
      race: 'Unknown',
      class: 'Unknown',
      level: 0,
      photo: null,
      familyMembers: [],
      friendMembers: [],
      itemInventory: [],
      skillList: []
    };

    console.log('Sanitized form data:', formData);

    fetch(`https://${localIP}:443/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    })
    .then(response => {
      console.log('Received response:', response);
      if (!response.ok) {
        return response.text().then(text => { 
          throw new Error(text || 'Registration failed') 
        });
      }
      return response.text();
    })
    .then(data => {
      console.log('Registration successful:', data);
      this.showCharacterNameModal = true;
    })
    .catch(error => {
      console.error('Registration error:', error);
      this.errorMessage = error.message || 'Registration failed. Please try again.';
      this.showModal = true;
    });
  }

  submitCharacterName(): void {
    if (!this.characterName.trim()) {
      this.errorMessage = 'Character name is required.';
      this.showModal = true;
      return;
    }

    const formData = {
      characterName: DOMPurify.sanitize(this.characterName),
      email: DOMPurify.sanitize(this.registerForm.value.email)
    };

    fetch(`https://${localIP}:443/update-character-name`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    })
    .then(response => {
      if (!response.ok) {
        return response.text().then(text => { 
          throw new Error(text) 
        });
      }
      return response.text();
    })
    .then(data => {
      console.log('Character name updated successfully:', data);
      this.showCharacterNameModal = false;
      // Navigate to login mode so user can log in with their new account
      this.isLoginMode = true;
      // Clear the form
      this.email = '';
      this.password = '';
      this.registerForm.reset({
        username: '',
        email: '',
        password: '',
        role: 'Player',
        characterName: 'User'
      });
      this.characterName = '';
    })
    .catch(error => {
      console.error('Character name update error:', error);
      this.showCharacterNameModal = false;
      this.errorMessage = error.message || 'Failed to update character name. Please try again.';
      this.showModal = true;
    });
  }

  closeModal(event?: Event): void {
    if (event && event.target !== event.currentTarget) {
      return;
    }
    this.showModal = false;
    this.errorMessage = null;
  }

  navigateTo(route: string): void {
    this.router.navigate([`/${route}`]);
  }
}
