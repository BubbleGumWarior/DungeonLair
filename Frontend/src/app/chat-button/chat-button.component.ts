import { Component, HostListener, Input, AfterViewChecked, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { io } from 'socket.io-client';
import { localIP } from '../config'; // Import the IP address

interface ChatMessage {
  username: string;
  message: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chat-button',
  standalone: true,
  templateUrl: './chat-button.component.html',
  styleUrls: ['./chat-button.component.css'],
  imports: [CommonModule, FormsModule]
})
export class ChatButtonComponent implements AfterViewChecked, OnDestroy {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  isOpen = false;
  chatHistory: ChatMessage[] = [];
  messageValue: string = "";
  isNewMessage: boolean = false;
  socket: any; // Socket connection
  buttonColor: string = 'default-color'; // Default button color

  @Input() set newMessage(message: string) {
    if (message) {
      this.addMessageToChat(this.username || 'User', message);
      this.toggleChat();
    }
  }

  @Input() username: string = 'User';

  ngAfterViewChecked() {
    if (this.scrollContainer) {
      this.scrollToBottom();
    }
  }

  constructor() {
    this.loadChatHistory();
    this.setupSocketConnection();
  }

  setupSocketConnection() {
    // Connect to the Socket.IO server
    this.socket = io(`https://${localIP}:8080`, {
      transports: ['websocket']
    });

    // Listen for new messages
    this.socket.on('newMessage', (message: ChatMessage) => {
      this.addMessageToChat(message.username, message.message);
      
      // Change button color only if the sender is not the current user
      if (message.username !== this.username) {
        this.isNewMessage = true; // Set new message flag
        this.changeButtonColor(); // Call method to change the button color
      }
    });

    // Optional: Add error handling
    this.socket.on('connect', () => {
      console.log('Connected to the Socket.IO server');
    });
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.isNewMessage = false; // Reset the new message flag when chat is opened
      this.resetButtonColor(); // Reset button color when chat is opened
    }
  }

  closeChat() {
    this.isOpen = false;
  }

  async loadChatHistory() {
    try {
      const response = await fetch(`https://${localIP}:8080/chat-history/`);
      if (!response.ok) throw new Error('Failed to fetch chat history');

      const chatHistory = await response.json();
      this.updateChatHistory(chatHistory);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  }

  updateChatHistory(chat: any) {
    this.chatHistory = chat.sort((a: ChatMessage, b: ChatMessage) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    if (this.chatHistory.length > 0) {
      const latestMessage = this.chatHistory[0];
      if (latestMessage.username !== this.username) {
        this.isNewMessage = true; // Set new message flag if the latest message is from a different user
        this.changeButtonColor(); // Change button color for new messages from other users
      }
    }
  }

  async sendMessage() {
    if (this.messageValue.trim()) {
      const newMessage: ChatMessage = {
        username: this.username,
        message: this.messageValue,
        timestamp: new Date(),
      };

      try {
        const response = await fetch(`https://${localIP}:8080/chat-history/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newMessage),
        });

        if (!response.ok) throw new Error('Failed to send message');

        this.messageValue = ''; // Clear the input field
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  }

  addMessageToChat(username: string, message: string) {
    const newChatMessage: ChatMessage = {
      username,
      message,
      timestamp: new Date(),
    };

    this.chatHistory.push(newChatMessage);
    this.chatHistory.sort((a: ChatMessage, b: ChatMessage) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Check if the message is from another user
    if (this.chatHistory.length > 1 && this.chatHistory[0].username !== username) {
      this.isNewMessage = true; // Flag for new messages from other users
      this.changeButtonColor(); // Change button color if the new message is from another user
    }
  }

  changeButtonColor() {
    this.buttonColor = 'highlight-color'; // Change to your desired highlight color
  }

  resetButtonColor() {
    this.buttonColor = 'default-color'; // Reset to default button color
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

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect(); // Clean up socket connection on component destroy
    }
  }
}
