import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- Add this import
import { localIP } from '../config'; // Import the IP address
import { WebSocketService } from '../services/websocket.service'; // Import WebSocketService


@Component({
  selector: 'app-sound-button',
  standalone: true,
  templateUrl: './sound.component.html',
  styleUrls: ['./sound.component.css'],
  imports: [CommonModule, FormsModule] // <-- Add FormsModule here
})
export class SoundComponent implements OnInit {
  isOpen = false;
  sounds: any[] = [];
  showUploadModal = false;
  uploadSoundId = '';
  uploadFile: File | null = null;

  constructor(private elRef: ElementRef, private wsService: WebSocketService) {}

  ngOnInit() {
    this.fetchSounds();
  }

  fetchSounds() {
    fetch(`https://${localIP}:443/api/sounds`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        this.sounds = data;
        console.log('Fetched sounds:', data);
      })
      .catch(err => {
        console.error('Failed to fetch sounds:', err);
      });
  }

  openModal() {
    this.isOpen = true;
  }

  closeModal() {
    this.isOpen = false;
  }

  openUploadModal() {
    this.showUploadModal = true;
    this.uploadSoundId = '';
    this.uploadFile = null;
  }

  closeUploadModal() {
    this.showUploadModal = false;
  }

  onFileSelected(event: any) {
    const file = event.target.files && event.target.files[0];
    this.uploadFile = file || null;
  }

  async uploadSound() {
    if (!this.uploadSoundId || !this.uploadFile) {
      alert('Please provide a sound ID and select a file.');
      return;
    }
    const formData = new FormData();
    formData.append('id', this.uploadSoundId);
    formData.append('file', this.uploadFile);

    try {
      await fetch(`https://${localIP}:443/api/upload-sound`, {
        method: 'POST',
        body: formData
      });
      this.closeUploadModal();
      this.fetchSounds();
    } catch (err) {
      alert('Failed to upload sound.');
      console.error(err);
    }
  }

  logSound(sound: any) {
    // Ensure path is in the correct format
    const filename = sound.path
      ? sound.path.split('/').pop()
      : (sound.file?.name || '');
    const path = `/assets/sounds/${filename}`;
    console.log('Sound to play:', { id: sound.id, path });
    this.wsService.playSound({ id: sound.id, path });
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.isOpen) return;
    const modal = this.elRef.nativeElement.querySelector('.sound-modal');
    if (modal && !modal.contains(event.target as Node)) {
      this.closeModal();
    }
    if (this.showUploadModal) {
      const uploadModal = this.elRef.nativeElement.querySelector('.upload-modal');
      if (uploadModal && !uploadModal.contains(event.target as Node)) {
        this.closeUploadModal();
      }
    }
  }
}
