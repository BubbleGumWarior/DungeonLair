import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { HomeComponent } from './home/home.component';
import { BattleAreaComponent } from './battle-area/battle-area.component'; // Import the new component
import { GalleryComponent } from './gallery/gallery.component'; // Import the new component
import { CharactersGalleryComponent } from './charactersGallery/charactersGallery.component'; // Import the new component

export const routes: Routes = [
    { path: '', component: HomeComponent },       // Route to LoginComponent
    { path: 'login', component: LoginComponent },       // Route to LoginComponent
    { path: 'register', component: RegisterComponent }, // Route to RegisterComponent
    { path: 'battle-area', component: BattleAreaComponent }, // Add route for battle-area
    { path: 'gallery', component: GalleryComponent }, // Add route for gallery
    { path: 'characters-gallery', component: CharactersGalleryComponent } // Add route for characters-gallery
];