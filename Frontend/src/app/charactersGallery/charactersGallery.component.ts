import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { localIP } from '../config';
import { WebSocketService } from '../services/websocket.service';
import { ChatButtonComponent } from '../chat-button/chat-button.component';
import { RollButtonComponent } from '../roll-button/roll-button.component'; // Import RollButtonComponent
import { VoiceChatComponent } from '../voice-chat/voice-chat.component'; // Import VoiceChatComponent
import { jwtDecode } from 'jwt-decode'; // Import jwtDecode

@Component({
  selector: 'app-characters-gallery',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, ChatButtonComponent, RollButtonComponent, VoiceChatComponent], // Add RollButtonComponent to imports
  templateUrl: './charactersGallery.component.html',
  styleUrl: './charactersGallery.component.css'
})
export class CharactersGalleryComponent implements OnInit {
  role: string | null = null;
  username: string | null = null;
  diceResult: string = '';
  newCharacterName: string = '';
  selectedFile: File | null = null;
  newCharacterRace: string = ''; // Add this property
  newCharacterClass: string = ''; // Add this property
  newCharacterLevel: number = 1; // Add this property
  isAddCharacterModalOpen: boolean = false;
  images: any[] = []; // Add this property to store images
  latestImage: any = null; // Add this property to store the latest image
  isMobile: boolean = false; // Add property to check if the user is on a mobile device

  constructor(private route: ActivatedRoute, private router: Router, private webSocketService: WebSocketService, private http: HttpClient) {}

  ngOnInit() {
    this.isMobile = window.innerWidth <= 768; // Check if the user is on a mobile device
    this.loadDataFromToken(); // Load data from token
    this.fetchCharacters(); // Fetch images on initialization
  }

  loadDataFromToken() {
    const token = localStorage.getItem('token'); // Get the JWT from localStorage
    if (token) {
      try {
        const decoded: any = jwtDecode(token); // Decode the JWT
        this.username = decoded.username; // Extract the username
        this.role = decoded.role; // Extract the role
      } catch (error) {
        console.error('Failed to decode token:', error);
      }
    }
  }

  closeGallery() {
    this.router.navigate(['/']);
  }

  handleDiceResult(result: string) {
    this.diceResult = result;
  }

  openAddCharacterModal() {
    this.isAddCharacterModalOpen = true;
  }

  closeAddCharacterModal() {
    this.isAddCharacterModalOpen = false;
    this.newCharacterName = '';
    this.selectedFile = null;
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  createCharacter() {
    if (this.newCharacterName && this.selectedFile) {
      const formData = new FormData();
      formData.append('image', this.selectedFile);
      formData.append('characterName', this.newCharacterName);
      formData.append('race', this.newCharacterRace);
      formData.append('class', this.newCharacterClass);
      formData.append('level', this.newCharacterLevel.toString());
      formData.append('familyMembers', JSON.stringify([])); // Default empty array
      formData.append('friendMembers', JSON.stringify([])); // Default empty array
      formData.append('itemInventory', JSON.stringify([])); // Default empty array
      formData.append('skillList', JSON.stringify([])); // Default empty array

      this.http.post(`https://${localIP}:443/create-character`, formData)
        .subscribe(
          (response: any) => {
            console.log('Character created successfully:', response.character);
            this.fetchCharacters(); // Refresh the character list after upload
            this.closeAddCharacterModal();
          },
          (error) => {
            console.error('Error creating character:', error);
          }
        );
    }
  }

  fetchCharacters() {
    this.http.get(`https://${localIP}:443/all-characters`)
      .subscribe(
        (response: any) => {
          console.log('Characters fetched:', response); // Log all character objects
          this.images = response
            .filter((character: any) => character.characterName !== null && character.characterName !== 'Dungeon Master')
            .map((character: any) => ({
              imageName: character.characterName,
              photo: `https://${localIP}:443${character.photo}` // Ensure correct photo URL
            }))
            .sort((a: any, b: any) => {
              if (a.imageName && b.imageName) {
                return a.imageName.localeCompare(b.imageName);
              }
              return 0;
            });
          this.latestImage = this.images.reduce((latest, image) => {
            return !latest || new Date(image.createdAt) > new Date(latest.createdAt) ? image : latest;
          }, null);
        },
        (error) => {
          console.error('Error fetching characters:', error);
        }
      );
  }

  openChatButton() {
    // Logic to open chat button if needed
  }

}
