import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { localIP } from '../config'; // Import the IP address
import { jwtDecode } from 'jwt-decode'; // Import jwtDecode

export interface UserInBattle {
  characterName: string;
  speed: number;
  health: number;
  currentSpeed: number;
  currentHealth: number;
  action: boolean;
  bonusAction: boolean;
  movement: boolean;
  stun: number; // Add stun field
  burn: number; // Add burn field
  poison: number; // Add poison field
  bleed: number; // Add bleed field
  buffstack: number; // Add buffstack field
  cooldowns?: { [skillID: number]: number }; // Add cooldowns field
  magicResist: number; // Add magicResist field
  protections: number; // Add protections field
  maskID: number; // Add maskID field
}

interface VcMember {
  username: string;
}

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

  onNewMessage(callback: (message: any) => void) {
    this.socket.on('newMessage', callback);
  }

  loginUser(user: { username: string, role: string }) {
    this.socket.emit('loginUser', user);
  }

  registerUser(user: { username: string, role: string }) {
    this.socket.emit('registerUser', user);
  }

  async uploadGalleryImage(formData: FormData) {
    const response = await fetch(`https://${localIP}:8080/upload-gallery-image`, {
      method: 'POST',
      body: formData
    });
    const result = await response.json();
    return result;
  }

  async fetchGalleryImages() {
    const response = await fetch(`https://${localIP}:8080/images`);
    const images = await response.json();
    return images;
  }

  broadcastGalleryImage(filePath: string, name: string) {
    this.socket.emit('broadcastGalleryImage', { filePath, name });
  }

  onGalleryImage(callback: (data: { filePath: string, name: string }) => void) {
    this.socket.on('galleryImage', (data) => {
      callback(data);
    });
  }

  updateVcMembers(members: VcMember[]) {
    this.socket.emit('updateVcMembers', members);
  }

  onVcMembersUpdate(callback: (members: VcMember[]) => void) {
    this.socket.on('vcMembersUpdate', callback);
  }

  addVcMember(member: VcMember) {
    this.socket.emit('addVcMember', member);
  }

  removeVcMember(username: string) {
    this.socket.emit('removeVcMember', username);
  }

  requestVcMembers() {
    this.socket.emit('requestVcMembers');
  }

  sendRtcOffer(username: string, offer: RTCSessionDescriptionInit) {
    this.socket.emit('rtcOffer', { username, offer });
  }

  sendRtcAnswer(username: string, answer: RTCSessionDescriptionInit) {
    this.socket.emit('rtcAnswer', { username, answer });
  }

  sendRtcIceCandidate(username: string, candidate: RTCIceCandidateInit) {
    this.socket.emit('rtcIceCandidate', { username, candidate });
  }

  onRtcOffer(callback: (username: string, offer: RTCSessionDescriptionInit) => void) {
    this.socket.on('rtcOffer', callback);
  }

  onRtcAnswer(callback: (username: string, answer: RTCSessionDescriptionInit) => void) {
    this.socket.on('rtcAnswer', callback);
  }

  onRtcIceCandidate(callback: (username: string, candidate: RTCIceCandidateInit) => void) {
    this.socket.on('rtcIceCandidate', callback);
  }

  async joinBattle(characterName: string) {
    this.socket.emit('joinBattle', characterName);
  }

  leaveBattle(characterName: string) {
    this.socket.emit('leaveBattle', characterName);
  }

  onUsersInBattleUpdate(callback: (users: UserInBattle[]) => void) {
    this.socket.on('usersInBattleUpdate', callback);
  }

  requestUsersInBattle() {
    this.socket.emit('requestUsersInBattle');
  }

  emitUsersInBattleUpdate(usersInBattle: UserInBattle[]) {
    this.socket.emit('usersInBattleUpdate', usersInBattle);
  }

  emitTimerStart() {
    this.socket.emit('startTimer');
  }

  onTimerStart(callback: (data: { timer: number, cycleCount: number }) => void) {
    this.socket.on('timerStart', callback);
  }
}
