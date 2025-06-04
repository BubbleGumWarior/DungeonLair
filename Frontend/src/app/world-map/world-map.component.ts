import { Component, OnInit, ViewChild, ElementRef, Renderer2 } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { CommonModule } from '@angular/common'; // Import CommonModule
import { WebSocketService } from '../services/websocket.service'; // Import WebSocketService
import { localIP } from '../config'; // Import the IP address
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-world-map',
  standalone: true,
  imports: [FormsModule, CommonModule], // Add CommonModule to imports
  templateUrl: './world-map.component.html',
  styleUrl: './world-map.component.css'
})
export class WorldMapComponent implements OnInit {
  role: string | null = null; // Initialize role as null
  isUniversityMap: boolean = false; // Add property to track slider state
  liveUsers: { 
    username: string,
    photoPath: string,
  }[] = []; // Add property to store live users
  @ViewChild('moveCanvas') moveCanvas!: ElementRef<HTMLCanvasElement>; // Add ViewChild for canvas
  username: string | null = null; // Add property to store username
  modalVisible: boolean = false;
  modalPosition = { top: 0, left: 0 };
  selectedUser: { username: string, characterID: string } | null = null;
  hoveredCharacter: {
    characterName: string;
    photo: string;
    equippedItemPath: string;
  } | null = null;

  constructor(
    private webSocketService: WebSocketService, 
    private renderer: Renderer2,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadDataFromToken();
    this.webSocketService.onMapChange((isUniversityMap: boolean) => {
      this.isUniversityMap = isUniversityMap;
    });

    // Query server for live users
    this.webSocketService.requestLiveUsers();
    this.webSocketService.onLiveUsersUpdate(async (users: { username: string, photoPath?: string}[]) => {
      // Fetch photoPath for each user asynchronously
      const updatedUsers = await Promise.all(users.map(async user => {
        let photoPath = user.photoPath;
        if (!photoPath) {
          photoPath = await this.fetchPhotoPath(user.username);
        }
        return {
          ...user,
          photoPath: photoPath || 'default/path/to/photo.jpg'
        };
      }));
      this.liveUsers = updatedUsers
        .sort((a, b) => a.username === 'BubbleGumWarior' ? -1 : b.username === 'BubbleGumWarior' ? 1 : 0); // Ensure Dungeon Master is first
    });
  }

  loadDataFromToken() {
    const token = localStorage.getItem('token'); // Get the JWT from localStorage
    if (token) {
      try {
        const decoded: any = jwtDecode(token); // Decode the JWT
        this.role = decoded.role; // Extract the role
        this.username = decoded.username; // Extract the username
      } catch (error) {
        console.error('Failed to decode token:', error);
      }
    }
  }

  toggleMap() {
    this.isUniversityMap = !this.isUniversityMap;
    this.webSocketService.emitMapChange(this.isUniversityMap);
  }

  async fetchPhotoPath(username: string): Promise<string> {
    try {
      const characterIdRes = await fetch(`https://dungeonlair.ddns.net:8080/character-id-username/${username}`);
      const characterIdData = await characterIdRes.json();
      if (!characterIdData.characterID) return 'default/path/to/photo.jpg';
      const characterRes = await fetch(`https://dungeonlair.ddns.net:8080/character-info/${characterIdData.characterID}`);
      const characterData = await characterRes.json();
      if (characterData.photo) {
        return `https://${localIP}:8080${characterData.photo}`;
      }
    } catch (error) {
      console.error('Error fetching photo path:', error);
    }
    return 'default/path/to/photo.jpg';
  }
  
  // Show modal on hover
  async onUserHover(user: { username: string }, event: MouseEvent) {
    try {
      const res = await fetch(`https://dungeonlair.ddns.net:8080/character-id-username/${user.username}`);
      const data = await res.json();
      this.selectedUser = {
        username: user.username,
        characterID: data.characterID
      };
      // Position modal to the left of the live users panel, vertically centered to hovered user
      const liveUsersPanel = document.querySelector('.fixed.right-4');
      let left = 0;
      let top = 0;
      if (liveUsersPanel) {
        const panelRect = (liveUsersPanel as HTMLElement).getBoundingClientRect();
        left = panelRect.left - 340; // 320px modal width + 20px gap
        // Vertically center modal to hovered user
        const liElem = (event.target as HTMLElement).closest('li');
        if (liElem) {
          const liRect = liElem.getBoundingClientRect();
          top = liRect.top + liRect.height / 2 - 40; // 40px offset to center modal
        } else {
          top = panelRect.top;
        }
      } else {
        // fallback to mouse position
        left = event.clientX - 340;
        top = event.clientY - 40;
      }

      // Fetch character details from backend and save to hoveredCharacter
      const detailsRes = await fetch('https://dungeonlair.ddns.net:8080/hover-character-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterID: data.characterID })
      });
      if (detailsRes.ok) {
        const details = await detailsRes.json();
        this.hoveredCharacter = {
          characterName: details.characterName,
          photo: `https://${localIP}:8080${details.photo}`,
          equippedItemPath: `https://${localIP}:8080${details.equippedItemPath}`
        };
      } else {
        this.hoveredCharacter = null;
      }

      this.modalPosition = { top, left };
      this.modalVisible = true;
    } catch (error) {
      this.modalVisible = false;
      this.selectedUser = null;
      this.hoveredCharacter = null;
    }
  }

  // Hide modal on mouse leave
  onUserLeave() {
    this.modalVisible = false;
    this.selectedUser = null;
    this.hoveredCharacter = null;
  }
}
