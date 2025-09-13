import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { localIP } from '../config';
import { jwtDecode } from 'jwt-decode';
import { WebSocketService } from '../services/websocket.service';

@Component({
  selector: 'app-mask-collection',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './mask-collection.component.html',
  styleUrl: './mask-collection.component.css'
})
export class MaskCollectionComponent implements OnInit, OnDestroy {
  maskCollection: any[] = [];
  maskDetails: { [key: number]: any } = {}; // Store mask details by maskID
  newMaskID: number | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  isDungeonMaster = false;
  role: string | null = null;
  
  // Skills modal properties
  showSkillsModal = false;
  selectedMaskID: number | null = null;
  selectedMaskPassiveSkill = '';
  activeSkills: any[] = [];
  loadingSkills = false;

  constructor(private http: HttpClient, private webSocketService: WebSocketService) {}

  ngOnInit() {
    this.checkDungeonMasterStatus();
    this.loadMaskCollection();
    this.loadMaskDetails();
    
    // Listen for WebSocket mask collection updates
    this.webSocketService.onMaskCollectionUpdate((data) => {
      console.log('Received mask collection update:', data);
      if (data.action === 'added' || data.action === 'removed') {
        this.loadMaskCollection();
        this.loadMaskDetails();
      }
    });
  }

  ngOnDestroy() {
    // Cleanup is handled automatically by Socket.IO service
  }

  checkDungeonMasterStatus() {
    // Check if the user is a Dungeon Master by decoding the JWT token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        this.role = decoded.role;
        console.log('Decoded role:', this.role);
        this.isDungeonMaster = this.role === 'Dungeon Master';
      } catch (error) {
        console.error('Failed to decode token:', error);
        this.isDungeonMaster = false;
      }
    } else {
      this.isDungeonMaster = false;
    }
  }

  loadMaskCollection() {
    this.isLoading = true;
    this.http.get<any[]>(`https://${localIP}:443/api/mask-collection`).subscribe({
      next: (data) => {
        console.log('Loaded mask collection:', data);
        // Sort masks by maskID in ascending order
        this.maskCollection = data.sort((a, b) => a.maskID - b.maskID);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading mask collection:', error);
        this.errorMessage = 'Failed to load mask collection';
        this.isLoading = false;
      }
    });
  }

  loadMaskDetails() {
    this.http.get<any[]>(`https://${localIP}:443/mask-list`).subscribe({
      next: (data) => {
        // Create a map of maskID to mask details
        data.forEach(mask => {
          this.maskDetails[mask.maskID] = {
            ...mask,
            photo: mask.photo.startsWith('http') ? mask.photo : `https://${localIP}:443${mask.photo}` // Ensure correct photo URL
          };
        });
      },
      error: (error) => {
        console.error('Error loading mask details:', error);
      }
    });
  }

  getMaskDetail(maskID: number) {
    return this.maskDetails[maskID] || null;
  }

  addMask() {
    if (!this.newMaskID || this.newMaskID <= 0) {
      this.errorMessage = 'Please enter a valid mask ID (positive number)';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.post(`https://${localIP}:443/api/mask-collection`, { maskID: this.newMaskID }).subscribe({
      next: (response) => {
        this.successMessage = `Mask ${this.newMaskID} added successfully!`;
        this.newMaskID = null;
        this.isLoading = false;
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error adding mask:', error);
        if (error.status === 404) {
          this.errorMessage = error.error?.error || `Mask ${this.newMaskID} does not exist`;
        } else if (error.status === 409) {
          this.errorMessage = error.error?.error || `Mask ${this.newMaskID} is already in your collection`;
        } else {
          this.errorMessage = 'Failed to add mask to collection';
        }
        this.isLoading = false;
      }
    });
  }

  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  trackByMaskId(index: number, mask: any): number {
    return mask.id;
  }

  removeMask(maskId: number, maskIDNumber: number) {
    console.log(`Attempting to remove mask - Collection ID: ${maskId}, Mask ID: ${maskIDNumber}`);
    
    if (confirm(`Are you sure you want to remove Mask ${maskIDNumber} from your collection?`)) {
      this.isLoading = true;
      this.clearMessages(); // Clear any existing messages
      
      console.log(`DELETE request URL: https://${localIP}:443/api/mask-collection/${maskId}`);
      this.http.delete(`https://${localIP}:443/api/mask-collection/${maskId}`).subscribe({
        next: (response) => {
          // Immediately remove the mask from local array for responsive UI
          this.maskCollection = this.maskCollection.filter(mask => mask.id !== maskId)
                                                  .sort((a, b) => a.maskID - b.maskID);
          this.successMessage = `Mask ${maskIDNumber} removed from collection!`;
          this.isLoading = false;
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          console.error('Error removing mask:', error);
          this.isLoading = false;
          
          if (error.status === 404) {
            // Mask doesn't exist on server - remove from local array and show message
            this.maskCollection = this.maskCollection.filter(mask => mask.id !== maskId)
                                                    .sort((a, b) => a.maskID - b.maskID);
            this.errorMessage = `Mask ${maskIDNumber} was not found in collection (may have been already removed by another user)`;
          } else if (error.status === 403) {
            this.errorMessage = 'You do not have permission to remove masks from the collection';
          } else {
            this.errorMessage = `Failed to remove mask from collection: ${error.status} ${error.statusText}`;
          }
          
          // Clear error message after 5 seconds
          setTimeout(() => {
            this.errorMessage = '';
          }, 5000);
        }
      });
    }
  }

  onImageError(event: any) {
    event.target.src = 'assets/images/placeholder-mask.png';
  }

  showMaskSkills(maskID: number) {
    const maskDetail = this.getMaskDetail(maskID);
    if (!maskDetail) {
      console.error('Mask details not found for ID:', maskID);
      return;
    }

    this.selectedMaskID = maskID;
    this.selectedMaskPassiveSkill = maskDetail.passiveSkill || '';
    this.showSkillsModal = true;
    this.loadActiveSkills(maskDetail.activeSkills || []);
  }

  loadActiveSkills(activeSkillIDs: number[]) {
    if (!activeSkillIDs || activeSkillIDs.length === 0) {
      this.activeSkills = [];
      return;
    }

    this.loadingSkills = true;
    const skillIDs = activeSkillIDs.join(',');
    
    this.http.get(`https://${localIP}:443/mask-skills?skillIDs=${skillIDs}`).subscribe({
      next: (skills: any) => {
        this.activeSkills = Array.isArray(skills) ? skills : [skills];
        this.loadingSkills = false;
      },
      error: (error) => {
        console.error('Error fetching active skills:', error);
        this.activeSkills = [];
        this.loadingSkills = false;
      }
    });
  }

  closeSkillsModal() {
    this.showSkillsModal = false;
    this.selectedMaskID = null;
    this.selectedMaskPassiveSkill = '';
    this.activeSkills = [];
  }

  formatPassiveSkillText(text: string): string {
    if (!text) {
      return 'No passive skill defined';
    }
    // Convert newlines to <br> tags to preserve line breaks
    return text.replace(/\n/g, '<br>');
  }

  formatSkillDescription(text: string): string {
    if (!text) {
      return '';
    }
    // Convert newlines to <br> tags to preserve line breaks
    return text.replace(/\n/g, '<br>');
  }
}
