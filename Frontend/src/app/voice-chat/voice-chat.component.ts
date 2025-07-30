import { Component, OnInit, OnDestroy, Input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceChatService } from '../services/voice-chat.service';

interface VcMember {
  username: string;
  isMuted?: boolean;
  isConnected?: boolean;
}

@Component({
  selector: 'app-voice-chat',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voice-chat.component.html',
  styleUrls: ['./voice-chat.component.css']
})
export class VoiceChatComponent implements OnInit, OnDestroy {
  @Input() username: string = '';
  
  isOpen = false;

  constructor(public voiceChatService: VoiceChatService) {}

  ngOnInit() {
    // Request current VC members when component initializes
    this.voiceChatService.requestVcMembers();
  }

  ngOnDestroy() {
    // Don't automatically leave voice chat on destroy
    // The service will persist the connection
  }

  toggleModal() {
    this.isOpen = !this.isOpen;
  }

  closeModal() {
    this.isOpen = false;
  }

  onBackdropClick(event: Event) {
    // Close modal when clicking on the backdrop (outside the modal content)
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  async joinVoiceChat() {
    await this.voiceChatService.joinVoiceChat(this.username);
  }

  leaveVoiceChat() {
    this.voiceChatService.leaveVoiceChat();
  }

  toggleMute() {
    this.voiceChatService.toggleMute();
  }

  // Delegate methods to service
  get isInVoiceChat(): boolean {
    return this.voiceChatService.isInVoiceChat;
  }

  get isMuted(): boolean {
    return this.voiceChatService.isMuted;
  }

  get vcMembers(): VcMember[] {
    return this.voiceChatService.vcMembers;
  }

  isMobile(): boolean {
    return this.voiceChatService.isMobile();
  }

  getConnectedMembersCount(): number {
    return this.voiceChatService.getConnectedMembersCount();
  }

  isCurrentUser(username: string): boolean {
    return this.voiceChatService.isCurrentUser(username);
  }

  // Debug method to check audio elements
  debugAudioElements() {
    this.voiceChatService.debugAudioElements();
  }

  // Method to manually enable audio (in case autoplay is blocked)
  enableAudio() {
    this.voiceChatService.enableAudio();
  }
}
