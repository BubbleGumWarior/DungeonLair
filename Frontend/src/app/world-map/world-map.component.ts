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
    this.webSocketService.onLiveUsersUpdate((users: { username: string, photoPath?: string}[]) => {
      this.liveUsers = users.map(user => ({
        ...user,
        photoPath: user.photoPath || this.getPhoto(user.username), // Provide a default photoPath if missing
      }));
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

  getPhoto(username: string) {
    const user = this.liveUsers.find(user => user.username === username);
    if (user) {
      // Query for characterID in the user table of the database
      fetch(`https://dungeonlair.ddns.net:8080/character-id-username/${username}`)
        .then(response => response.json())
        .then(data => {
          // Query for photoPath in the character table of the database
          fetch(`https://dungeonlair.ddns.net:8080/character-info/${data.characterID}`)
            .then(response => response.json())
            .then(characterData => {
              // Assign photo path to the live users object
              this.liveUsers = this.liveUsers.map(u => 
                u.username === username ? { ...u, photoPath: `https://${localIP}:8080${characterData.photo}` } : u
              );
            })
            .catch(error => {
              console.error('Error fetching photo path:', error);
            });
        })
        .catch(error => {
          console.error('Error fetching character ID:', error);
        });
    }
    return user ? user.photoPath : 'default/path/to/photo.jpg'; // Provide a default photoPath if missing
  }
}
