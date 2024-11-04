import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { localIP } from '../config'; // Import the IP address
import DOMPurify from 'dompurify'; // Import DOMPurify

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  imports: [ReactiveFormsModule]
})
export class RegisterComponent {
  registerForm: FormGroup;
  submitted = false;
  errorMessage: string | null = null;

  constructor(private fb: FormBuilder, private router: Router) {
    this.registerForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['Player'],
      characterName: ['User' + Math.floor(Math.random() * 1000) + 1]
    });
  }

  get f() {
    return this.registerForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = null;

    if (this.registerForm.invalid) {
      this.errorMessage = 'Please fill out the form correctly.';
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

    // Validate data types
    if (typeof formData.username !== 'string' || typeof formData.email !== 'string' || typeof formData.password !== 'string' || typeof formData.role !== 'string' || typeof formData.characterName !== 'string') {
      this.errorMessage = 'Invalid data types in form fields.';
      return;
    }

    // Use fetch API to send POST request to the register endpoint
    fetch(`https://${localIP}:8080/register`, {
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
      this.navigateTo('/');
    })
    .catch(error => {
      this.errorMessage = `There was a problem with the fetch operation: ${error.message}`;
      console.error('There was a problem with the fetch operation:', error);
    });
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }
}
