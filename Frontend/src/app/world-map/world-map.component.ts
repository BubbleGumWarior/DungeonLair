import { Component, OnInit, ViewChild, ElementRef, Renderer2 } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { CommonModule } from '@angular/common'; // Import CommonModule
import { WebSocketService } from '../services/websocket.service'; // Import WebSocketService
import { localIP } from '../config'; // Import the IP address

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

  constructor(private webSocketService: WebSocketService, private renderer: Renderer2) {}

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
      console.log('Live users:', this.liveUsers);
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

  getPhoto(username: string) {
    // No longer needed for initial fetch, but keep for fallback
    const user = this.liveUsers.find(user => user.username === username);
    return user ? user.photoPath : 'default/path/to/photo.jpg';
  }
}
