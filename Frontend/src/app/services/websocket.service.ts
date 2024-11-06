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

  onBattleStarted(callback: () => void) {
    this.socket.on('battleStarted', callback);
  }

  onBattleEnded(callback: () => void) {
    this.socket.on('battleEnded', callback);
  }

  startBattle() {
    this.socket.emit('startBattle');
  }

  endBattle() {
    this.socket.emit('endBattle');
  }

  joinBattle(user: { username: string, characterName: string, initiative: { random: number, modifier: number, final: number } }) {
    this.socket.emit('joinBattle', user);
  }

  leaveBattle(user: { username: string, characterName: string }) {
    this.socket.emit('leaveBattle', user);
  }

  updateHealth(user: { username: string, characterName: string, currentHealth: number, shield?: number }) {
    user.currentHealth = Math.max(0, user.currentHealth); // Ensure health is not less than 0
    console.log('Emitting health update for:', user.characterName);
    console.log('Current health:', user.currentHealth);
    console.log('Shield:', user.shield); // Log the shield value
    this.socket.emit('updateHealth', user);
  }

  onHealthUpdate(callback: (user: { username: string, characterName: string, currentHealth: number, shield?: number }) => void) {
    this.socket.on('healthUpdate', callback);
  }

  getActiveBattleUsers() {
    return new Observable<{ username: string, characterName: string, initiative: { random: number, modifier: number, final: number } }[]>(observer => {
      this.socket.emit('getActiveBattleUsers');
      this.socket.on('activeBattleUsers', (users: { username: string, characterName: string, initiative: { random: number, modifier: number, final: number } }[]) => {
        observer.next(users);
      });
    });
  }

  onActiveBattleUsers(callback: (users: { username: string, characterName: string, initiative: { random: number, modifier: number, final: number } }[]) => void) {
    this.socket.on('activeBattleUsers', callback);
  }

  getLiveUsers() {
    return new Observable<{ username: string }[]>(observer => {
      this.socket.emit('getLiveUsers');
      this.socket.on('liveUsers', (users: { username: string }[]) => {
        observer.next(users);
      });
    });
  }

  sendInitiativePrompt(username: string) {
    console.log('Emitting initiative prompt for:', username);
    this.socket.emit('sendInitiativePrompt', username);
  }

  getAllCharacterNames() {
    return new Observable<{ characterName: string }[]>(observer => {
      this.socket.emit('getAllCharacterNames');
      this.socket.on('allCharacterNames', (characterNames: { characterName: string }[]) => {
        observer.next(characterNames);
      });
    });
  }

  onInitiativePrompt(callback: () => void) {
    this.socket.on('initiativePrompt', () => {
      console.log('Initiative prompt received');
      callback();
    });
  }

  updateTurnIndex(index: number) {
    this.socket.emit('updateTurnIndex', index);
  }

  onTurnIndexUpdate(callback: (index: number) => void) {
    this.socket.on('turnIndexUpdate', callback);
  }
}
