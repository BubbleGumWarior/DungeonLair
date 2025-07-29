import { Routes } from '@angular/router';
import { AuthComponent } from './auth/auth.component';
import { HomeComponent } from './home/home.component';
import { BattleAreaComponent } from './battle-area/battle-area.component'; // Import the new component
import { GalleryComponent } from './gallery/gallery.component'; // Import the new component
import { CharactersGalleryComponent } from './charactersGallery/charactersGallery.component'; // Import the new component
import { AdminPanelComponent } from './admin-panel/admin-panel.component'; // Import admin panel
import { ChangePasswordComponent } from './change-password/change-password.component'; // Import change password

export const routes: Routes = [
    { path: '', component: HomeComponent },       // Route to HomeComponent
    { path: 'home', component: HomeComponent },   // Add explicit home route
    { path: 'login', component: AuthComponent },       // Route to AuthComponent (login mode)
    { path: 'register', component: AuthComponent }, // Route to AuthComponent (register mode)
    { path: 'auth', component: AuthComponent }, // Route to AuthComponent
    { path: 'battle-area', component: BattleAreaComponent }, // Add route for battle-area
    { path: 'gallery', component: GalleryComponent }, // Add route for gallery
    { path: 'characters-gallery', component: CharactersGalleryComponent }, // Add route for characters-gallery
    { path: 'admin-panel', component: AdminPanelComponent }, // Add route for admin panel
    { path: 'change-password', component: ChangePasswordComponent } // Add route for change password
];