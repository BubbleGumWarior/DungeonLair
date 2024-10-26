import { Component, HostListener, Input, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
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
export class ChatButtonComponent implements AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  isOpen = false;
  chatHistory: ChatMessage[] = [];

  // Input to receive the new dice result from the parent component (HomeComponent)
  @Input() set newMessage(message: string) {
    if (message) {
      this.addMessageToChat(this.username || 'User', message);  // Use the provided username or default to 'User'
    }
  }
  @Input() username: string = 'User';

  ngAfterViewChecked() {
    if (this.scrollContainer) {
      this.scrollToBottom();
    }
  }

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

  // Function to add new messages to the chat history
  addMessageToChat(sender: string, message: string) {
    this.chatHistory.unshift({
      sender,
      message,
      timestamp: new Date()
    });
    this.toggleChat();
  }

  private scrollToBottom(): void {
    const container = this.scrollContainer.nativeElement;
    container.scrollTop = container.scrollHeight;
  }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: HTMLElement) {
    const clickedInside = targetElement.closest('.chat-modal') || targetElement.closest('.chat-button');
    if (!clickedInside) {
      this.closeChat();
    }
  }
}
