import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { localIP } from '../config';
import { WebSocketService } from '../services/websocket.service';
import { ChatButtonComponent } from '../chat-button/chat-button.component';
import { jwtDecode } from 'jwt-decode'; // Import jwtDecode

@Component({
  selector: 'app-spaceshipGallery',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, ChatButtonComponent],
  templateUrl: './spaceshipGallery.component.html',
  styleUrl: './spaceshipGallery.component.css'
})
export class SpaceshipGalleryComponent implements OnInit {
  role: string | null = null;
  username: string | null = null;
  diceResult: string = '';
  newSpaceshipImageName: string = '';
  newShipClass: string = ''; // Add new property for ship class
  newShipSize: string = ''; // Add new property for ship size
  newAtmosphereSpeed: string = ''; // Add new property for atmosphere speed
  newSpaceSpeed: string = ''; // Add new property for space speed
  newDescription: string = ''; // Add new property for description
  selectedFile: File | null = null;
  isAddSpaceshipImageModalOpen: boolean = false;
  spaceshipSpaceshipImages: any[] = []; // Add this property to store spaceshipSpaceshipImages
  latestSpaceshipImage: any = null; // Add this property to store the latest spaceshipSpaceshipImage
  hoveredDescription: string | null = null; // Add property to store hovered description
  isMobile: boolean = false; // Add property to check if the user is on a mobile device

  constructor(private route: ActivatedRoute, private router: Router, private webSocketService: WebSocketService, private http: HttpClient) {}

  ngOnInit() {
    this.isMobile = window.innerWidth <= 768; // Check if the user is on a mobile device
    this.loadDataFromToken(); // Load data from token
    this.fetchSpaceshipImages(); // Fetch spaceshipSpaceshipImages on initialization
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

  openAddSpaceshipImageModal() {
    this.isAddSpaceshipImageModalOpen = true;
  }

  closeAddSpaceshipImageModal() {
    this.isAddSpaceshipImageModalOpen = false;
    this.newSpaceshipImageName = '';
    this.newShipClass = ''; // Reset ship class
    this.newShipSize = ''; // Reset ship size
    this.newAtmosphereSpeed = ''; // Reset atmosphere speed
    this.newSpaceSpeed = ''; // Reset space speed
    this.newDescription = ''; // Reset description
    this.selectedFile = null;
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  uploadSpaceshipImage() {
    if (this.newSpaceshipImageName && this.selectedFile && this.newShipClass && this.newShipSize && this.newAtmosphereSpeed && this.newSpaceSpeed && this.newDescription) {
      const formData = new FormData();
      formData.append('spaceshipImage', this.selectedFile);
      formData.append('spaceshipImageName', this.newSpaceshipImageName);
      formData.append('shipClass', this.newShipClass); // Append ship class
      formData.append('shipSize', this.newShipSize); // Append ship size
      formData.append('atmosphereSpeed', this.newAtmosphereSpeed); // Append atmosphere speed
      formData.append('spaceSpeed', this.newSpaceSpeed); // Append space speed
      formData.append('description', this.newDescription); // Append description

      this.http.post(`https://${localIP}:8080/upload-spaceshipGallery-spaceshipImage`, formData)
        .subscribe(
          (response: any) => {
            console.log('SpaceshipImage uploaded successfully:', response.filePath);
            this.closeAddSpaceshipImageModal();
          },
          (error) => {
            console.error('Error uploading spaceshipImage:', error);
          }
        );
    }
  }

  fetchSpaceshipImages() {
    this.http.get(`https://${localIP}:8080/spaceshipImages`)
      .subscribe(
        (response: any) => {
          this.spaceshipSpaceshipImages = response.map((spaceshipImage: any) => ({
            ...spaceshipImage,
            photo: `https://${localIP}:8080${spaceshipImage.photo}`
          })).sort((a: any, b: any) => {
            if (a.spaceshipImageName && b.spaceshipImageName) {
              return a.spaceshipImageName.localeCompare(b.spaceshipImageName);
            }
            return 0;
          });
          this.latestSpaceshipImage = this.spaceshipSpaceshipImages.reduce((latest, spaceshipImage) => {
            return !latest || new Date(spaceshipImage.createdAt) > new Date(latest.createdAt) ? spaceshipImage : latest;
          }, null);
        },
        (error) => {
          console.error('Error fetching spaceshipImages:', error);
        }
      );
  }

  formatDescription(description: string): string {
    return description.replace(/\\n/g, '<br>');
  }

  showDescription(description: string) {
    this.hoveredDescription = description;
  }

  hideDescription() {
    this.hoveredDescription = null;
  }
}
