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
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, ChatButtonComponent],
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.css'
})
export class GalleryComponent implements OnInit {
  role: string | null = null;
  username: string | null = null;
  diceResult: string = '';
  newImageName: string = '';
  selectedFile: File | null = null;
  isAddImageModalOpen: boolean = false;
  images: any[] = []; // Add this property to store images
  latestImage: any = null; // Add this property to store the latest image

  constructor(private route: ActivatedRoute, private router: Router, private webSocketService: WebSocketService, private http: HttpClient) {}

  ngOnInit() {
    this.loadDataFromToken(); // Load data from token
    this.fetchImages(); // Fetch images on initialization
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

  openAddImageModal() {
    this.isAddImageModalOpen = true;
  }

  closeAddImageModal() {
    this.isAddImageModalOpen = false;
    this.newImageName = '';
    this.selectedFile = null;
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  uploadImage() {
    if (this.newImageName && this.selectedFile) {
      const formData = new FormData();
      formData.append('image', this.selectedFile);
      formData.append('imageName', this.newImageName);

      this.http.post(`https://${localIP}:8080/upload-gallery-image`, formData)
        .subscribe(
          (response: any) => {
            console.log('Image uploaded successfully:', response.filePath);
            this.closeAddImageModal();
          },
          (error) => {
            console.error('Error uploading image:', error);
          }
        );
    }
  }

  fetchImages() {
    this.http.get(`https://${localIP}:8080/images`)
      .subscribe(
        (response: any) => {
          this.images = response.map((image: any) => ({
            ...image,
            photo: `https://${localIP}:8080${image.photo}`
          })).sort((a: any, b: any) => a.imageName.localeCompare(b.imageName));
          this.latestImage = this.images.reduce((latest, image) => {
            return !latest || new Date(image.createdAt) > new Date(latest.createdAt) ? image : latest;
          }, null);
        },
        (error) => {
          console.error('Error fetching images:', error);
        }
      );
  }
}