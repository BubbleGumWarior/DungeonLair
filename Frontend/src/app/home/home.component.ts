import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule
// Remove HttpClientModule import
import { BoardComponent } from '../board/board.component';
import { FamilyComponent } from '../family/family.component';
import { FriendsComponent } from '../friends/friends.component';
import { InventoryComponent } from '../inventory/inventory.component';
import { SkillsComponent } from '../skills/skills.component';
import { NotesComponent } from '../notes/notes.component';
import { ChatButtonComponent } from '../chat-button/chat-button.component';
import { RollButtonComponent } from '../roll-button/roll-button.component';
import { vcButtonComponent } from '../vcbutton/vcbutton.component';
import { SoundbarComponent } from '../soundbar/soundbar.component';
import { DMScreenComponent } from '../dmscreen/dmscreen.component';
import { jwtDecode } from 'jwt-decode';
import { WebSocketService } from '../services/websocket.service';
import { localIP } from '../config'; // Import localIP from config
import { ScoreComponent } from '../score/score.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BoardComponent,
    FamilyComponent,
    FriendsComponent,
    InventoryComponent,
    SkillsComponent,
    NotesComponent,
    ChatButtonComponent,
    RollButtonComponent,
    vcButtonComponent,
    SoundbarComponent,
    DMScreenComponent,
    ScoreComponent,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  diceResult: string = '';
  username: string | null = null; // Initialize username as null
  characterName: string | null = null;
  role: string | null = null; // Initialize role as null
  localIP: string = localIP; // Initialize localIP with the value from config
  showGalleryModal: boolean = false; // Add property to control gallery modal visibility
  galleryImageName: string = ''; // Add property to store the image name
  galleryImageFile: File | null = null; // Add property to store the selected image file
  showGalleryImageModal: boolean = false; // Add property to control gallery image display modal visibility
  galleryImageData: { filePath: string, name: string } | null = null; // Add property to store the received gallery image data
  photo: string = "";
  showMobileMenu: boolean = false; // Add property to control mobile menu visibility

  constructor(private router: Router, private webSocketService: WebSocketService) {}

  ngOnInit() {
    this.loadDataFromToken();
    if (!this.username) {
      this.router.navigate(['/login']);
    }
    // Log in the user upon initialization
    if (this.username && this.role) {
      console.log('Logging in user:', this.username, 'with role:', this.role);
      this.webSocketService.loginUser({ username: this.username, role: this.role });
    }
    this.webSocketService.onGalleryImage((data: { filePath: string, name: string }) => {
      console.log('Gallery image received:', data);
      if (data.name !== this.username) { // Show the image to all users except the one who uploaded it
        this.galleryImageData = {
          ...data,
          filePath: `https://${localIP}:8080${data.filePath}`
        };
        this.showGalleryImageModal = true;
      }
    });
    if (this.role === 'Dungeon Master') {
      this.username = 'Dungeon Master';
    }
  }

  loadDataFromToken() {
    const token = localStorage.getItem('token'); // Get the JWT from localStorage
    if (token) {
      try {
        const decoded: any = jwtDecode(token); // Decode the JWT
        this.username = decoded.username; // Extract the username
        this.characterName = decoded.characterName;
        this.role = decoded.role; // Extract the role
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
  }

  navigateTo(route: string) {
    if (route === 'login') {
      localStorage.clear(); // Clear local storage on logout
    }
    this.router.navigate([route]);
  }

  openGalleryModal() {
    this.showGalleryModal = true;
  }

  closeGalleryModal() {
    this.showGalleryModal = false;
    this.galleryImageName = '';
    this.galleryImageFile = null;
  }

  handleImageUpload(event: any) {
    this.galleryImageFile = event.target.files[0];
    console.log('Selected image file:', this.galleryImageFile);
  }

  submitGalleryImage() {
    if (this.galleryImageName && this.galleryImageFile) {
      const formData = new FormData();
      formData.append('image', this.galleryImageFile);
      formData.append('name', this.galleryImageName);

      // Send the image to the server
      this.webSocketService.uploadGalleryImage(formData).then(response => {
        console.log('Image uploaded successfully:', response);
        this.webSocketService.broadcastGalleryImage(response.filePath, this.galleryImageName);
        this.closeGalleryModal();
      }).catch(error => {
        console.error('Error uploading image:', error);
      });
    }
  }

  closeGalleryImageModal() {
    console.log('Closing gallery image modal');
    this.showGalleryImageModal = false;
    this.galleryImageData = null;
  }

  isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  isHomeView(): boolean {
    return this.currentView === 'home';
  }

  navigateToBattle() {
    this.router.navigate(['/battle-map'], { queryParams: { characterName: this.characterName, username: this.username, maxHealth: 100, currentHealth: 100, role: this.role } });
  }
}
