import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ChatMessage {
  sender: string;
  message: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chat-button',
  standalone: true,
  templateUrl: './chat-button.component.html',
  styleUrls: ['./chat-button.component.css'],
  imports: [CommonModule]
})
export class ChatButtonComponent {
  isOpen = false;
  chatHistory: ChatMessage[] = [];

  constructor() {
    this.loadDemoChats();
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  closeChat() {
    this.isOpen = false;
  }

  loadDemoChats() {
    this.chatHistory = Array.from({ length: 30 }, (_, index) => ({
      sender: index % 2 === 0 ? 'User' : 'Bot',
      message: `This is a ${index % 2 === 0 ? 'user' : 'bot'} message number ${index + 1}.`,
      timestamp: new Date()
    }));
  }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: HTMLElement) {
    const clickedInside = targetElement.closest('.chat-modal') || targetElement.closest('.chat-button');
    if (!clickedInside) {
      this.closeChat();
    }
  }
}
