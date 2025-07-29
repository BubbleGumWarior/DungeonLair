import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { localIP } from '../config'; // Import the IP address
import DOMPurify from 'dompurify'; // Import DOMPurify
import { CommonModule } from '@angular/common'; // Import CommonModule
import { FormsModule } from '@angular/forms'; // Import FormsModule

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  imports: [ReactiveFormsModule, CommonModule, FormsModule] // Add FormsModule here
})
export class RegisterComponent {
  registerForm: FormGroup;
  submitted = false;
  errorMessage: string | null = null;
  isMobile: boolean = false;
  loginImageUrl: string = `https://${localIP}:443/assets/images/LoginBackground.jpg`;
  showModal: boolean = false; // Add this line
  showCharacterNameModal: boolean = false; // Add this line
  characterName: string = ''; // Add this line
  showPassword: boolean = false; // Add password visibility toggle

  constructor(private fb: FormBuilder, private router: Router) {
    this.isMobile = window.innerWidth <= 768; // Detect if the device is mobile
    this.registerForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['Player'],      
      characterName: "User"
    });
  }

  get f() {
    return this.registerForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = null;
    console.log('Form submitted:', this.registerForm.value);

    if (this.registerForm.invalid) {
      if (this.f['email'].errors?.['email']) {
        this.errorMessage = 'Please enter a valid email address.';
      } else if (this.f['password'].errors?.['minlength']) {
        this.errorMessage = 'Password must be at least 6 characters long.';
      } else {
        this.errorMessage = 'Please fill out the form correctly.';
      }
      console.log('Form is invalid:', this.registerForm.errors);
      Object.keys(this.registerForm.controls).forEach(key => {
        const controlErrors = this.registerForm.get(key)?.errors;
        if (controlErrors) {
          console.log(`Control: ${key}, Errors:`, controlErrors);
        }
      });
      this.showModal = true; // Show modal on error
      return;
    }

    const password = this.registerForm.value.password;
    // if (!this.isPasswordValid(password)) {
    //   this.errorMessage = 'Password must contain a mix of letters and numbers.';
    //   console.log('Password validation failed:', password);
    //   this.showModal = true; // Show modal on error
    //   return;
    // }

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

    // Validate data types
    if (typeof formData.username !== 'string' || typeof formData.email !== 'string' || typeof formData.password !== 'string' || typeof formData.role !== 'string' || typeof formData.characterName !== 'string') {
      this.errorMessage = 'Invalid data types in form fields.';
      console.log('Invalid data types:', formData);
      return;
    }

    // Use fetch API to send POST request to the register endpoint
    console.log('Sending POST request to register endpoint');
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
        return response.text().then(text => { throw new Error(text) });
      }
      return response.text();
    })
    .then(data => {
      console.log('Registration successful:', data);
      this.showCharacterNameModal = true; // Show character name modal
    })
    .catch(error => {
      this.errorMessage = `There was a problem with the fetch operation: ${error.message}`;
      console.error('There was a problem with the fetch operation:', error);
      this.showModal = true; // Show modal on error
    });
  }

  isPasswordValid(password: string): boolean {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
    return passwordRegex.test(password);
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  closeModal(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal')) {
      this.showModal = false;
    }
  }

  submitCharacterName(): void {
    if (!this.characterName) {
      this.errorMessage = 'Character name is required.';
      return;
    }
  
    const formData = {
      characterName: DOMPurify.sanitize(this.characterName),
      email: DOMPurify.sanitize(this.registerForm.value.email) // Include email in the request body
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
        return response.text().then(text => { throw new Error(text) });
      }
      return response.text();
    })
    .then(data => {
      console.log('Character name updated successfully:', data);
      this.navigateTo('/login');
    })
    .catch(error => {
      this.errorMessage = `There was a problem with the fetch operation: ${error.message}`;
      console.error('There was a problem with the fetch operation:', error);
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}
