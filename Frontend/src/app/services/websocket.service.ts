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
  skillList?: string[]; // Add skillList property
  abilityDamage: number; // Add abilityDamage field
}

interface VcMember {
  username: string;
  isMuted?: boolean;
  isConnected?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket;

  constructor() {
    this.socket = io(`https://${localIP}:443`);
    this.socket.on('connect', () => {
      console.log('Socket.IO connection established');
      console.log('Socket ID:', this.socket.id);
      // Log in the user upon connection
      const username = localStorage.getItem('username'); // Assuming username is stored in localStorage
      const role = localStorage.getItem('role'); // Assuming role is stored in localStorage
      if (username && role) {
        this.loginUser({ username, role });
      }
    });
    this.socket.on('disconnect', () => console.log('Socket.IO connection closed'));
    this.socket.on('connect_error', (error) => console.error('Socket.IO error:', error));
    this.socket.on('battleMessage', (message) => {
      console.log('Battle Message:', message); // Log the battle message
    });
    // Remove direct play logic here, move to a subscription method
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
    const response = await fetch(`https://${localIP}:443/upload-gallery-image`, {
      method: 'POST',
      body: formData
    });
    const result = await response.json();
    return result;
  }

  async fetchGalleryImages() {
    const response = await fetch(`https://${localIP}:443/images`);
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

  updateVcMemberStatus(username: string, isMuted: boolean) {
    this.socket.emit('updateVcMemberStatus', { username, isMuted });
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

  joinBattle(maskID: number) {
    this.socket.emit('joinBattle', maskID);
  }

  leaveBattle(maskID: number) {
    this.socket.emit('leaveBattle', maskID);
  }

  onMaskJoinedBattle(callback: (data: { maskID: number }) => void) {
    this.socket.on('maskJoinedBattle', callback);
  }

  onMaskLeftBattle(callback: (data: { maskID: number }) => void) {
    this.socket.on('maskLeftBattle', callback);
  }

  onMasksInBattleUpdate(callback: (masks: any[]) => void) {
    this.socket.on('masksInBattleUpdate', callback);
  }

  sendSkillAction(maskID: number, skillID: number, targetMaskIDs: number[]) {
    this.socket.emit('skillAction', { maskID, skillID, targetMaskIDs }); // Ensure maskID is sent correctly
  }

  updateTeams(teamChanges: { maskID: number, team: string }[]) {
    this.socket.emit('updateTeams', teamChanges);
  }

  onBattleMessage(callback: (message: string) => void) {
    this.socket.on('battleMessage', callback);
  }

  emitMapChange(isUniversityMap: boolean) {
    this.socket.emit('mapChange', isUniversityMap);
  }

  onMapChange(callback: (isUniversityMap: boolean) => void) {
    this.socket.on('mapChange', callback);
  }

  onLiveUsersUpdate(callback: (users: { username: string }[]) => void) {
    this.socket.on('liveUsersUpdate', callback);
  }

  requestLiveUsers() {
    this.socket.emit('requestLiveUsers');
  }

  removeMask(maskID: number) {
    this.socket.emit('removeMask', maskID); // Emit the removeMask event with the maskID
  }

  removeMaskFromUser(maskID: number) {
    this.socket.emit('removeMaskFromUser', maskID); // Emit the removeMask event with the maskID
  }

  assignMaskToCharacter(characterID: number, maskID: number) {
    this.socket.emit('assign-mask-to-character', { characterID, maskID });
  }

  // Add methods to handle masks in battle
  addMaskToBattle(maskID: number) {
    this.socket.emit('add-mask-to-battle', { maskID });
  }

  emitMasksInBattleUpdate(masksInBattle: any[]) {
    this.socket.emit('masksInBattleUpdate', masksInBattle);
  }

  endBattle() {
    this.socket.emit('end-battle');
  }

  onEndBattle(callback: () => void) {
    this.socket.on('end-battle', callback);
  }

  resetHealth() {
    this.socket.emit('resetHealth'); // Emit the resetHealth event
  }

  onTimeUpdate(callback: (data: { time: string; day: string }) => void) {
    this.socket.on('timeUpdate', callback);
  }

  onPlaySound(callback: (sound: { id: string, path: string }) => void) {
    this.socket.on('playSound', callback);
  }

  async playSound(sound: any) {
    await fetch(`https://${localIP}:443/api/play-sound`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sound)
    });
  }

  onMaskCollectionUpdate(callback: (data: { action: string, maskID: number, maskData?: any, recordId?: number }) => void) {
    this.socket.on('maskCollectionUpdate', callback);
  }
}
