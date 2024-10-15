import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },       // Route to LoginComponent
    { path: 'login', component: LoginComponent },       // Route to LoginComponent
    { path: 'register', component: RegisterComponent }, // Route to RegisterComponent
];