import { Component, HostListener, Input, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule

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
export class ChatButtonComponent implements AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  isOpen = false;
  chatHistory: ChatMessage[] = [];
  messageValue: string = "";

  // Input to receive the new message from the parent component (HomeComponent)
  @Input() set newMessage(message: string) {
    if (message) {
      this.addMessageToChat(this.username || 'User', message);  // Use the provided username or default to 'User'
      this.toggleChat();  // Toggle chat when a new message is received from @Input
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
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  closeChat() {
    this.isOpen = false;
  }

  async loadChatHistory() {
    try {
      const response = await fetch(`http://localhost:3000/chat-history/`);
      if (!response.ok) throw new Error('Failed to fetch chat history');
      
      const chatHistory = await response.json();
      this.updateChatHistory(chatHistory);  // Update chat with the fetched data
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  }

  updateChatHistory(chat: any) {
    this.chatHistory = chat.sort((a: ChatMessage, b: ChatMessage) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(); // Sort by timestamp in descending order
    });
  }

  async sendMessage() {
    if (this.messageValue.trim()) {
      const newMessage: ChatMessage = {
        username: this.username, // Use the provided username
        message: this.messageValue,
        timestamp: new Date(),
      };

      try {
        const response = await fetch(`http://localhost:3000/chat-history/`, {
          method: 'POST', // Set the request method to POST
          headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
          },
          body: JSON.stringify(newMessage), // Convert the message object to a JSON string
        });

        if (!response.ok) throw new Error('Failed to send message');

        // If message is sent successfully, update the chat history locally
        this.addMessageToChat(newMessage.username, newMessage.message);
        this.messageValue = ''; // Clear the input field after sending
        // Do not toggle chat here
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  }

  // Function to add new messages to the chat history
  addMessageToChat(username: string, message: string) {
    const newChatMessage: ChatMessage = {
      username,
      message,
      timestamp: new Date(),
    };

    this.chatHistory.push(newChatMessage); // Add new message to the chat history
    this.chatHistory.sort((a: ChatMessage, b: ChatMessage) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(); // Sort by timestamp in descending order
    });
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
