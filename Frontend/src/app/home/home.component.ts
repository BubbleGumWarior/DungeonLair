import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { HttpClientModule } from '@angular/common/http'; // Import HttpClientModule
import { WorldMapComponent } from '../world-map/world-map.component';
import { BoardComponent } from '../board/board.component';
import { FamilyComponent } from '../family/family.component';
import { FriendsComponent } from '../friends/friends.component';
import { InventoryComponent } from '../inventory/inventory.component';
import { SkillsComponent } from '../skills/skills.component';
import { NotesComponent } from '../notes/notes.component';
import { ChatButtonComponent } from '../chat-button/chat-button.component';
import { RollButtonComponent } from '../roll-button/roll-button.component';
import { SoundComponent } from '../sound/sound.component';
import { SoundbarComponent } from '../soundbar/soundbar.component';
import { DMScreenComponent } from '../dmscreen/dmscreen.component';
import { jwtDecode } from 'jwt-decode';
import { WebSocketService } from '../services/websocket.service';
import { localIP } from '../config'; // Import localIP from config
import { ScoreComponent } from '../score/score.component';
import { MaskCollectionComponent } from '../mask-collection/mask-collection.component';
import { AdminPanelComponent } from '../admin-panel/admin-panel.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule, // Add HttpClientModule here
    WorldMapComponent,
    BoardComponent,
    FamilyComponent,
    FriendsComponent,
    InventoryComponent,
    SkillsComponent,
    NotesComponent,
    ChatButtonComponent,
    RollButtonComponent,
    SoundComponent,
    SoundbarComponent,
    DMScreenComponent,
    ScoreComponent,
    MaskCollectionComponent,
    AdminPanelComponent,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA] // Add this line
})
export class HomeComponent implements OnInit {
  diceResult: string = '';
  username: string | null = null; // Initialize username as null
  characterName: string | null = null;
  role: string | null = null; // Initialize role as null
  characterID: string | null = null; // Add characterID property
  localIP: string = localIP; // Initialize localIP with the value from config
  showMobileMenu: boolean = false; // Add property to control mobile menu visibility

  constructor(private router: Router, private webSocketService: WebSocketService) {}

  ngOnInit() {
    this.loadDataFromToken();
    if (!this.username) {
      this.router.navigate(['/auth']);
    }
    // Log in the user upon initialization
    if (this.username && this.role) {
      console.log('Logging in user:', this.username, 'with role:', this.role);
      this.webSocketService.loginUser({ username: this.username, role: this.role });
    }
    console.log('Character name in HomeComponent:', this.characterName); // Add this log

    // Listen for playSound event for all users
    this.webSocketService.onPlaySound((sound) => {
      const url = `https://${localIP}:443${sound.path}`;
      console.log('Received playSound event. Sound to play:', sound, 'URL:', url);
      const audio = new Audio(url);
      audio.play();
    });
  }

  loadDataFromToken() {
    const token = localStorage.getItem('token'); // Get the JWT from localStorage
    console.log('Token:', token); // Add this log
    if (token) {
      try {
        const decoded: any = jwtDecode(token); // Decode the JWT
        console.log('Decoded token:', decoded); // Add this log
        this.username = decoded.username; // Extract the username
        this.characterName = decoded.characterName;
        this.characterID = decoded.characterID;
        this.role = decoded.role; // Extract the role
        console.log('Extracted characterID:', this.characterID); // Add this log
      } catch (error) {
        console.error('Failed to decode token:', error);
      }
    }
  }

  handleDiceResult(result: string) {
    this.diceResult = result; // Update the result when emitted
  }

  currentView: string = 'home'; // Default view

  navigateView(view: string) {
    this.currentView = view;
    this.showMobileMenu = false;
  }

  navigateTo(route: string) {
    if (route === 'login' || route === 'auth') {
      localStorage.clear(); // Clear local storage on logout
    }
    // Handle auth routing for backward compatibility
    if (route === 'login') {
      route = 'auth';
    }
    this.router.navigate([route]);
  }

  isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  isHomeView(): boolean {
    return this.currentView === 'home';
  }

  navigateToBattle() {
    this.router.navigate(['/battle-area']);
  }

  navigateToGallery() {
    this.router.navigate(['/gallery']);
  }
  navigateToCharactersGallery() {
    this.router.navigate(['/characters-gallery']);
  }

  openChatButton() {
    // Logic to ensure the chat button component is visible
    console.log('Opening chat button component...');
    // Additional logic can be added here if needed
  }
}
