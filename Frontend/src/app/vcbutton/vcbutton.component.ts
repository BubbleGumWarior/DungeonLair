import { Component, HostListener, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { WebSocketService } from '../services/websocket.service';
import { localIP } from '../config'; // Import the IP address

interface VcMember {
  username: string;
}

@Component({
  selector: 'app-vc-button',
  standalone: true,
  templateUrl: './vcbutton.component.html',
  styleUrls: ['./vcbutton.component.css'],
  imports: [CommonModule, HttpClientModule]
})
export class vcButtonComponent implements OnInit {
  isOpen = false;
  vcMembers: VcMember[] = [];
  @Input() username: string = 'User';
  private mediaRecorder!: MediaRecorder;
  private audioChunks: Blob[] = [];

  constructor(private http: HttpClient, private webSocketService: WebSocketService) {}

  ngOnInit() {
    this.fetchLiveUsers();
    this.listenForUserUpdates();
  }

  togglevc() {
    this.isOpen = !this.isOpen;
  }

  closevc() {
    this.isOpen = false;
  }

  async toggleMember() {
    if (this.username) {
      const existingMemberIndex = this.vcMembers.findIndex(member => member.username === this.username);
      if (existingMemberIndex > -1) {
        // Username exists in the array, remove it
        this.vcMembers.splice(existingMemberIndex, 1);
        this.stopRecording();
      } else {
        // Username does not exist, add it
        this.vcMembers.push({ username: this.username });
        await this.startRecording();
        this.webSocketService.registerUser(this.username); // Register user when they join
      }
      this.webSocketService.sendMessage({ type: 'userUpdate', users: this.vcMembers });
    } else {
      console.error('No Username provided');
    }
  }

  isMember(): boolean {
    return this.vcMembers.some(member => member.username === this.username);
  }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: HTMLElement) {
    const clickedInside = targetElement.closest('.vc-modal') || targetElement.closest('.vc-button');
    if (!clickedInside) {
      this.closevc();
    }
  }

  private async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/wav';
      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Recording data available:', event.data);
          this.webSocketService.sendAudio(event.data); // Send audio chunk to server
        }
      };
      this.mediaRecorder.start(100); // Record in chunks of 100ms
      console.log('Recording started with MIME type:', mimeType);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  }

  private stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      console.log('Recording stopped');
    }
  }

  private fetchLiveUsers() {
    this.http.get<VcMember[]>(`https://${localIP}:8080/api/live-users`).subscribe(
      (users) => {
        this.vcMembers = users;
      },
      (error) => {
        console.error('Error fetching live users:', error);
      }
    );
  }

  private listenForUserUpdates() {
    this.webSocketService.onUserUpdate((data) => {
      this.vcMembers = data.users;
    });

    // Listen for incoming audio data
    this.webSocketService.onAudio((audioBlob: Blob) => {
      console.log('Received audio data from server:', audioBlob);
      console.log('Audio MIME type:', audioBlob.type); // Log the MIME type of the received audio data
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('Audio URL:', audioUrl);
      const audio = new Audio(audioUrl);
      audio.onloadedmetadata = () => {
        console.log('Audio metadata loaded');
      };
      audio.onplay = () => {
        console.log('Audio playback started');
      };
      audio.onended = () => {
        console.log('Audio playback ended');
      };
      audio.onerror = (error) => {
        console.error('Error playing audio:', error);
      };
      // Ensure audio playback is triggered by a user interaction
      document.addEventListener('click', () => {
        audio.play().catch((error) => {
          console.error('Error starting audio playback:', error);
        });
      }, { once: true });
    });
  }
}
