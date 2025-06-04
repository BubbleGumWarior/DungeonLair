import { Component, HostListener, Input, ElementRef, ViewChild, OnDestroy, OnInit } from '@angular/core';
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
export class ChatButtonComponent implements OnDestroy, OnInit {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  isOpen = false;
  chatHistory: ChatMessage[] = [];
  messageValue: string = "";
  isNewMessage: boolean = false;
  socket: any; // Socket connection
  buttonColor: string = 'default-color'; // Default button color
  isPublicRollsEnabled: boolean = false; // State for the toggle button
  userRole: string = ''; // User role
  isMobile: boolean = false; // Property to detect mobile device

  @Input() set newMessage(message: string) {
    if (message) {
      this.toggleChat();
      if (this.isPublicRollsEnabled) {
        this.sendToChatHistory(message);
      } else {
        if (this.userRole !== 'Dungeon Master') {
          this.addMessageToChat('System', "You have " + message);
        }
        this.sendToDMChatHistory(message);
      }
    }
  }

  @Input() username: string = 'User';

  ngOnInit() {
    this.loadUserRole();
    this.loadChatHistory().then(() => {
      // After chat history is loaded, compare timestamps
      if (this.chatHistory.length > 0) {
        const latestTimestamp = this.chatHistory[0].timestamp;
        if (this.isMessageNewer(latestTimestamp)) {
          this.isNewMessage = true;
          this.changeButtonColor();
        }
      }
      // Save latest timestamp if chat is open on load
      if (this.isOpen && this.chatHistory.length > 0) {
        this.saveLatestMessageTimestamp(this.chatHistory[0].timestamp);
      }
    });
    this.setupSocketConnection();
    this.loadPublicRollsState(); // Load the public rolls state from local storage
    this.isMobile = window.innerWidth <= 768; // Check if the user is on a mobile device
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
      this.addMessageToChat(message.username, message.message, message.timestamp);

      // Save or compare timestamp logic
      if (this.isOpen) {
        this.saveLatestMessageTimestamp(message.timestamp);
        this.isNewMessage = false;
        this.resetButtonColor();
        setTimeout(() => this.scrollToBottom(), 100);
      } else {
        if (this.isMessageNewer(message.timestamp)) {
          this.isNewMessage = true;
          this.changeButtonColor();
        }
      }
    });

    // Listen for new DM messages only if the user is a Dungeon Master
    if (this.userRole === 'Dungeon Master') {
      this.socket.on('newDMMessage', (message: ChatMessage) => {
        if (message.username !== this.username) {
          this.addMessageToChat(message.username, message.message, message.timestamp);
          if (this.isOpen) {
            this.saveLatestMessageTimestamp(message.timestamp);
            this.isNewMessage = false;
            this.resetButtonColor();
            setTimeout(() => this.scrollToBottom(), 100);
          } else {
            if (this.isMessageNewer(message.timestamp)) {
              this.isNewMessage = true;
              this.changeButtonColor();
            }
          }
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
      // Save latest message timestamp when chat is opened
      if (this.chatHistory.length > 0) {
        this.saveLatestMessageTimestamp(this.chatHistory[0].timestamp);
      }
      setTimeout(() => this.scrollToBottom(), 100); // Scroll to bottom when chat is opened
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
    console.log('Chat history loaded:', this.chatHistory);

    // Remove old logic for isNewMessage here, handled by socket events
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
        setTimeout(() => this.scrollToBottom(), 100); // Scroll to bottom after sending a message
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  }

  async sendToChatHistory(message: string) {
    const sanitizedMessage = DOMPurify.sanitize(message);
    const newMessage: ChatMessage = {
      username: "System",
      message: this.username + " " + sanitizedMessage,
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
      setTimeout(() => this.scrollToBottom(), 100); // Scroll to bottom after sending a message
    } catch (error) {
      console.error('Error sending message to chat history:', error);
    }
  }

  async sendToDMChatHistory(message: string) {
    const sanitizedMessage = DOMPurify.sanitize(message);
    const newMessage: ChatMessage = {
      username: "System",
      message: this.username + " " + sanitizedMessage,
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
      setTimeout(() => this.scrollToBottom(), 100); // Scroll to bottom after sending a message
    } catch (error) {
      console.error('Error sending message to DM chat history:', error);
    }
  }

  addMessageToChat(username: string, message: string, timestamp?: Date) {
    const sanitizedMessage = DOMPurify.sanitize(message);
    const newChatMessage: ChatMessage = {
      username,
      message: sanitizedMessage,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    };

    this.chatHistory.push(newChatMessage);
    this.chatHistory.sort((a: ChatMessage, b: ChatMessage) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // No isNewMessage logic here, handled in socket event
  }

  changeButtonColor() {
    this.buttonColor = 'highlight-color'; // Change to your desired highlight color
  }

  resetButtonColor() {
    this.buttonColor = 'default-color'; // Reset to default button color
  }

  public scrollToBottom(): void {
    try {
      const container = this.scrollContainer.nativeElement;
      console.log('Container:', container);
      console.log('Container scrollHeight:', container.scrollHeight);
      console.log('Container clientHeight:', container.clientHeight);
      container.scrollTop = container.scrollHeight;
      console.log('Scrolled to bottom');
    } catch (err) {
      console.error('Scroll to bottom failed:', err);
    }
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

  // Save the latest message timestamp to localStorage
  saveLatestMessageTimestamp(timestamp: Date | string) {
    localStorage.setItem('latestChatTimestamp', new Date(timestamp).toISOString());
  }

  // Compare the incoming message timestamp with the one in localStorage
  isMessageNewer(incomingTimestamp: Date | string): boolean {
    const stored = localStorage.getItem('latestChatTimestamp');
    if (!stored) return true;
    return new Date(incomingTimestamp).getTime() > new Date(stored).getTime();
  }

  async onImageUpload(event: any) {
    const file = event.target.files[0];
    if (file && this.username) {
      // Only allow image files by extension
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
      const fileName = file.name.toLowerCase();
      const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
      if (!hasValidExtension) {
        console.error('Selected file does not have a valid image extension.');
        return;
      }
      const formData = new FormData();
      formData.append('image', file);

      try {
        const response = await fetch(`https://${localIP}:8080/save-image`, {
          method: 'POST',
          body: formData
        });
        if (!response.ok) throw new Error('Failed to upload image');
        const data = await response.json();
        // Send chat message with username "Photo - X" and message as the image path
        const newMessage = {
          username: `Photo - ${this.username}`,
          message: data.filePath,
          timestamp: new Date()
        };
        await fetch(`https://${localIP}:8080/chat-history/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMessage)
        });
        setTimeout(() => this.scrollToBottom(), 100);
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect(); // Clean up socket connection on component destroy
    }
  }
}
