import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { localIP } from '../config'; // Import the IP address

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket;

  constructor() {
    this.socket = io(`https://${localIP}:8080`);
    this.socket.on('connect', () => console.log('Socket.IO connection established'));
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

  registerUser(username: string) {
    this.socket.emit('registerUser', username);
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
}
