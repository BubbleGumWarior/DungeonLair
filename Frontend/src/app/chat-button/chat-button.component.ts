import { Component, HostListener, Input, AfterViewChecked, ElementRef, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { io } from 'socket.io-client';
import { localIP } from '../config'; // Import the IP address
import { jwtDecode } from 'jwt-decode';
import DOMPurify from 'dompurify'; // Import DOMPurify

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
export class ChatButtonComponent implements AfterViewChecked, OnDestroy, OnInit {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  isOpen = false;
  chatHistory: ChatMessage[] = [];
  messageValue: string = "";
  isNewMessage: boolean = false;
  socket: any; // Socket connection
  buttonColor: string = 'default-color'; // Default button color
  isPublicRollsEnabled: boolean = false; // State for the toggle button
  userRole: string = ''; // User role

  @Input() set newMessage(message: string) {
    if (message) {
      this.toggleChat();
      if (this.isPublicRollsEnabled) {
        this.sendToChatHistory(message);
      } else {
        this.addMessageToChat(this.username || 'User', message);
        this.sendToDMChatHistory(message);
      }
    }
  }

  @Input() username: string = 'User';

  ngOnInit() {
    this.loadUserRole();
    this.loadChatHistory();
    this.setupSocketConnection();
    this.loadPublicRollsState(); // Load the public rolls state from local storage
  }

  ngAfterViewChecked() {
    if (this.scrollContainer) {
      this.scrollToBottom();
    }
  }

  constructor() {}

  loadUserRole() {
    const token = localStorage.getItem('token'); // Get the JWT from localStorage
    if (token) {
      try {
        const decoded: any = jwtDecode(token); // Decode the JWT
        this.userRole = decoded.role; // Extract the user role
      } catch (error) {
        console.error('Failed to decode token:', error);
      }
    }
  }

  setupSocketConnection() {
    // Connect to the Socket.IO server
    this.socket = io(`wss://${localIP}:8080`, {
      transports: ['websocket']
    });

    // Register the user with the socket connection
    const token = localStorage.getItem('token'); // Get the JWT from localStorage
    if (token) {
      try {
        const decoded: any = jwtDecode(token); // Decode the JWT
        this.socket.emit('registerUser', { username: this.username, role: decoded.role });
      } catch (error) {
        console.error('Failed to decode token:', error);
      }
    }

    // Listen for new messages
    this.socket.on('newMessage', (message: ChatMessage) => {
      this.addMessageToChat(message.username, message.message);
      
      // Change button color only if the sender is not the current user
      if (message.username !== this.username) {
        this.isNewMessage = true; // Set new message flag
        this.changeButtonColor(); // Call method to change the button color
      }
    });

    // Listen for new DM messages only if the user is a Dungeon Master
    if (this.userRole === 'Dungeon Master') {
      this.socket.on('newDMMessage', (message: ChatMessage) => {
        // Only add the message if the sender is not the current user
        if (message.username !== this.username) {
          this.addMessageToChat(message.username, message.message);
          this.isNewMessage = true; // Set new message flag
          this.changeButtonColor(); // Call method to change the button color
        }
      });
    }

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
        const chatHistoryResponse = await fetch(`https://${localIP}:8080/chat-history/`);
        if (!chatHistoryResponse.ok) throw new Error('Failed to fetch chat history');
        const chatHistory = await chatHistoryResponse.json();

        let combinedHistory = chatHistory;

        if (this.userRole === 'Dungeon Master') {
            const token = localStorage.getItem('token'); // Get the JWT from localStorage
            const dmChatHistoryResponse = await fetch(`https://${localIP}:8080/dm-chat-history/`, {
                headers: {
                    'Authorization': token || ''
                }
            });
            if (!dmChatHistoryResponse.ok) throw new Error('Failed to fetch DM chat history');
            const dmChatHistory = await dmChatHistoryResponse.json();
            combinedHistory = [...chatHistory, ...dmChatHistory];
        }

        this.updateChatHistory(combinedHistory);
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
      const sanitizedMessage = DOMPurify.sanitize(this.messageValue);
      const newMessage: ChatMessage = {
        username: this.username,
        message: sanitizedMessage,
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

  async sendToChatHistory(message: string) {
    const sanitizedMessage = DOMPurify.sanitize(message);
    const newMessage: ChatMessage = {
      username: this.username,
      message: sanitizedMessage,
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

      if (!response.ok) throw new Error('Failed to send message to chat history');
    } catch (error) {
      console.error('Error sending message to chat history:', error);
    }
  }

  async sendToDMChatHistory(message: string) {
    const sanitizedMessage = DOMPurify.sanitize(message);
    const newMessage: ChatMessage = {
      username: this.username,
      message: sanitizedMessage,
      timestamp: new Date(),
    };

    try {
      const response = await fetch(`https://${localIP}:8080/dm-chat-history/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMessage),
      });

      if (!response.ok) throw new Error('Failed to send message to DM chat history');
    } catch (error) {
      console.error('Error sending message to DM chat history:', error);
    }
  }

  addMessageToChat(username: string, message: string) {
    const sanitizedMessage = DOMPurify.sanitize(message);
    const newChatMessage: ChatMessage = {
      username,
      message: sanitizedMessage,
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

  togglePublicRolls() {
    this.isPublicRollsEnabled = !this.isPublicRollsEnabled;
    this.savePublicRollsState(); // Save the public rolls state to local storage
    console.log('Public Rolls toggled:', this.isPublicRollsEnabled);
  }

  savePublicRollsState() {
    localStorage.setItem('isPublicRollsEnabled', JSON.stringify(this.isPublicRollsEnabled));
  }

  loadPublicRollsState() {
    const savedState = localStorage.getItem('isPublicRollsEnabled');
    if (savedState !== null) {
      this.isPublicRollsEnabled = JSON.parse(savedState);
    }
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect(); // Clean up socket connection on component destroy
    }
  }
}
