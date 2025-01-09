import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { localIP } from '../config'; // Import the IP address
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket;

  constructor() {
    this.socket = io(`https://${localIP}:8080`);
    this.socket.on('connect', () => {
      console.log('Socket.IO connection established');
      console.log('Socket ID:', this.socket.id);
      // Log in the user upon connection
      const username = localStorage.getItem('username'); // Assuming username is stored in localStorage
      const role = localStorage.getItem('role'); // Assuming role is stored in localStorage
      if (username && role) {
        console.log('Logging in user:', username, 'with role:', role);
        this.loginUser({ username, role });
      }
    });
    this.socket.on('disconnect', () => console.log('Socket.IO connection closed'));
    this.socket.on('connect_error', (error) => console.error('Socket.IO error:', error));
  }

  sendMessage(message: any) {
    this.socket.emit('message', message);
  }

  onMessage(callback: (message: any) => void) {
    this.socket.on('message', callback);
  }

  onUserUpdate(callback: (data: any) => void) {
    this.socket.on('userUpdate', callback);
  }

  onConnect(callback: () => void) {
    this.socket.on('connect', callback);
  }

  onNewMessage(callback: (message: any) => void) {
    this.socket.on('newMessage', callback);
  }

  onBattleUpdate(callback: (data: any) => void) {
    this.socket.on('battleUpdate', callback);
  }

  sendBattleUpdate(data: any) {
    this.socket.emit('battleUpdate', data);
  }

  loginUser(user: { username: string, role: string }) {
    this.socket.emit('loginUser', user);
  }

  registerUser(user: { username: string, role: string }) {
    this.socket.emit('registerUser', user);
  }

  sendAudio(audioChunk: Blob) {
    console.log('Sending audio data to server:', audioChunk);
    console.log('Audio MIME type:', audioChunk.type); // Log the MIME type of the sent audio data
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      console.log('Converted audio data to ArrayBuffer:', arrayBuffer);
      this.socket.emit('audio', { buffer: arrayBuffer, type: audioChunk.type });
    };
    reader.readAsArrayBuffer(audioChunk);
  }

  onAudio(callback: (audioBlob: Blob) => void) {
    this.socket.on('audio', (audioData: { buffer: ArrayBuffer, type: string }) => {
      console.log('Audio data received from server:', audioData.buffer);
      const audioBlob = new Blob([audioData.buffer], { type: audioData.type });
      console.log('Audio MIME type:', audioBlob.type); // Log the MIME type of the received audio data
      callback(audioBlob);
    });
  }

  getLiveUsers() {
    return new Observable<{ username: string }[]>(observer => {
      this.socket.emit('getLiveUsers');
      this.socket.on('liveUsers', (users: { username: string }[]) => {
        observer.next(users);
      });
    });
  }

  async uploadGalleryImage(formData: FormData) {
    console.log('Uploading gallery image with formData:', formData);
    const response = await fetch(`https://${localIP}:8080/upload-gallery-image`, {
      method: 'POST',
      body: formData
    });
    const result = await response.json();
    console.log('Gallery image upload response:', result);
    return result;
  }

  broadcastGalleryImage(filePath: string, name: string) {
    console.log('Broadcasting gallery image with filePath:', filePath, 'and name:', name);
    this.socket.emit('broadcastGalleryImage', { filePath, name });
  }

  onGalleryImage(callback: (data: { filePath: string, name: string }) => void) {
    this.socket.on('galleryImage', (data) => {
      console.log('Received gallery image broadcast:', data);
      callback(data);
    });
  }

  requestBattleState() {
    this.socket.emit('requestBattleState');
  }
}
