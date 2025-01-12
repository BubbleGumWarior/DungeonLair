import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { HomeComponent } from './home/home.component';
import { BattleMapComponent } from './battle-map/battle-map.component'; // Import the new component
import { GalleryComponent } from './gallery/gallery.component'; // Import the new component
import { SpaceshipGalleryComponent } from './spaceshipGallery/spaceshipGallery.component'; // Import the new component

export const routes: Routes = [
    { path: '', component: HomeComponent },       // Route to LoginComponent
    { path: 'login', component: LoginComponent },       // Route to LoginComponent
    { path: 'register', component: RegisterComponent }, // Route to RegisterComponent
    { path: 'battle-map', component: BattleMapComponent }, // Add route for battle-map
    { path: 'gallery', component: GalleryComponent }, // Add route for gallery
    { path: 'spaceship-gallery', component: SpaceshipGalleryComponent } // Add route for spaceship-gallery
];