import { Injectable } from '@angular/core';
import { WebSocketService } from './websocket.service';

interface VcMember {
  username: string;
  isMuted?: boolean;
  isConnected?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class VoiceChatService {
  // Persistent state
  public isInVoiceChat = false;
  public isMuted = false;
  public vcMembers: VcMember[] = [];
  public localStream: MediaStream | null = null;
  public peerConnections: Map<string, RTCPeerConnection> = new Map();
  public remoteStreams: Map<string, MediaStream> = new Map();

  private readonly iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];

  constructor(private webSocketService: WebSocketService) {
    this.setupWebSocketListeners();
  }

  private setupWebSocketListeners() {
    // Listen for voice chat members updates
    this.webSocketService.onVcMembersUpdate((members: VcMember[]) => {
      console.log('Voice chat members updated:', members);
      const previousMembers = this.vcMembers.map(m => m.username);
      this.vcMembers = members;
      
      // Check if current user is still in voice chat
      const currentUserInVc = members.find(m => m.username === this.getCurrentUsername());
      if (!currentUserInVc && this.isInVoiceChat) {
        this.leaveVoiceChat();
        return;
      }

      // If we're in voice chat, check for new members to connect to
      if (this.isInVoiceChat) {
        const currentMembers = members.map(m => m.username);
        const newMembers = currentMembers.filter(username => 
          !previousMembers.includes(username) && username !== this.getCurrentUsername()
        );
        
        // Connect to new members
        newMembers.forEach(async (username) => {
          console.log('New member detected, creating peer connection:', username);
          await this.createPeerConnection(username, true);
        });
      }
    });

    // Listen for WebRTC signaling
    this.webSocketService.onRtcOffer((username: string, offer: RTCSessionDescriptionInit) => {
      this.handleRtcOffer(username, offer);
    });

    this.webSocketService.onRtcAnswer((username: string, answer: RTCSessionDescriptionInit) => {
      this.handleRtcAnswer(username, answer);
    });

    this.webSocketService.onRtcIceCandidate((username: string, candidate: RTCIceCandidateInit) => {
      this.handleRtcIceCandidate(username, candidate);
    });
  }

  private getCurrentUsername(): string {
    // Get username from localStorage or current context
    return localStorage.getItem('username') || '';
  }

  async joinVoiceChat(username: string) {
    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }, 
        video: false 
      });

      console.log('Got local stream:', this.localStream);
      console.log('Local stream tracks:', this.localStream.getTracks());

      // Join voice chat on server
      this.webSocketService.addVcMember({ username });
      this.isInVoiceChat = true;

      // Wait a bit for the server to update the member list
      setTimeout(async () => {
        // Connect to existing members (excluding ourselves)
        const existingMembers = this.vcMembers.filter(member => member.username !== username);
        console.log('Connecting to existing members:', existingMembers);
        
        for (const member of existingMembers) {
          await this.createPeerConnection(member.username, true);
        }
      }, 500);

      console.log('Joined voice chat successfully');
    } catch (error) {
      console.error('Failed to join voice chat:', error);
      alert('Failed to access microphone. Please check your browser permissions and ensure you\'re using HTTPS.');
      this.isInVoiceChat = false;
    }
  }

  leaveVoiceChat() {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close all peer connections
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    this.remoteStreams.clear();

    // Leave voice chat on server
    if (this.isInVoiceChat) {
      this.webSocketService.removeVcMember(this.getCurrentUsername());
    }

    this.isInVoiceChat = false;
    this.isMuted = false;
  }

  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.isMuted = !audioTrack.enabled;
        
        // Update mute status on server
        this.webSocketService.updateVcMemberStatus(this.getCurrentUsername(), this.isMuted);
      }
    }
  }

  private async createPeerConnection(remoteUsername: string, shouldCreateOffer: boolean = false) {
    console.log('Creating peer connection with:', remoteUsername, 'shouldCreateOffer:', shouldCreateOffer);
    
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    this.peerConnections.set(remoteUsername, pc);

    // Add connection state change listener
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${remoteUsername}:`, pc.connectionState);
    };

    // Add ICE connection state change listener
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${remoteUsername}:`, pc.iceConnectionState);
    };

    // Add local stream to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        console.log('Adding track to peer connection:', track.kind, track.enabled);
        pc.addTrack(track, this.localStream!);
      });
    } else {
      console.warn('No local stream available when creating peer connection');
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('Received remote stream from:', remoteUsername, 'streams:', event.streams.length);
      if (event.streams && event.streams[0]) {
        const remoteStream = event.streams[0];
        console.log('Remote stream tracks:', remoteStream.getTracks().length);
        this.remoteStreams.set(remoteUsername, remoteStream);
        this.playRemoteStream(remoteUsername, remoteStream);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate to:', remoteUsername);
        this.webSocketService.sendRtcIceCandidate(remoteUsername, event.candidate);
      } else {
        console.log('All ICE candidates sent for:', remoteUsername);
      }
    };

    // Create offer if needed
    if (shouldCreateOffer) {
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        });
        await pc.setLocalDescription(offer);
        console.log('Sending offer to:', remoteUsername);
        this.webSocketService.sendRtcOffer(remoteUsername, offer);
      } catch (error) {
        console.error('Error creating offer for:', remoteUsername, error);
      }
    }
  }

  private async handleRtcOffer(username: string, offer: RTCSessionDescriptionInit) {
    console.log('Received RTC offer from:', username);
    
    if (!this.isInVoiceChat) {
      console.log('Not in voice chat, ignoring offer from:', username);
      return;
    }

    try {
      await this.createPeerConnection(username, false);
      const pc = this.peerConnections.get(username);
      if (pc) {
        await pc.setRemoteDescription(offer);
        console.log('Set remote description for offer from:', username);
        
        const answer = await pc.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        });
        await pc.setLocalDescription(answer);
        console.log('Created and set local description (answer) for:', username);
        
        this.webSocketService.sendRtcAnswer(username, answer);
        console.log('Sent answer to:', username);
      }
    } catch (error) {
      console.error('Error handling RTC offer from:', username, error);
    }
  }

  private async handleRtcAnswer(username: string, answer: RTCSessionDescriptionInit) {
    console.log('Received RTC answer from:', username);
    
    const pc = this.peerConnections.get(username);
    if (pc) {
      try {
        await pc.setRemoteDescription(answer);
        console.log('Set remote description (answer) from:', username);
      } catch (error) {
        console.error('Error setting remote description (answer) from:', username, error);
      }
    } else {
      console.warn('No peer connection found for answer from:', username);
    }
  }

  private async handleRtcIceCandidate(username: string, candidate: RTCIceCandidateInit) {
    console.log('Received ICE candidate from:', username);
    
    const pc = this.peerConnections.get(username);
    if (pc) {
      try {
        await pc.addIceCandidate(candidate);
        console.log('Added ICE candidate from:', username);
      } catch (error) {
        console.error('Error adding ICE candidate from:', username, error);
      }
    } else {
      console.warn('No peer connection found for ICE candidate from:', username);
    }
  }

  private playRemoteStream(username: string, stream: MediaStream) {
    console.log('Setting up audio element for:', username);
    
    // Create or get existing audio element
    let audioElement = document.getElementById(`audio-${username}`) as HTMLAudioElement;
    if (!audioElement) {
      audioElement = document.createElement('audio');
      audioElement.id = `audio-${username}`;
      audioElement.autoplay = true;
      audioElement.controls = false;
      audioElement.style.display = 'none';
      audioElement.volume = 1.0;
      audioElement.muted = false;
      document.body.appendChild(audioElement);
      console.log('Created new audio element for:', username);
    }
    
    // Set the stream
    audioElement.srcObject = stream;
    
    // Add event listeners for debugging
    audioElement.onloadedmetadata = () => {
      console.log('Audio metadata loaded for:', username);
      audioElement.play().then(() => {
        console.log('Audio started playing for:', username);
      }).catch(error => {
        console.error('Error starting audio for:', username, error);
      });
    };

    audioElement.onerror = (error) => {
      console.error('Audio element error for:', username, error);
    };

    // Force play (some browsers require user interaction)
    setTimeout(() => {
      if (audioElement.paused) {
        audioElement.play().catch(error => {
          console.error('Failed to auto-play audio for:', username, error);
          // Show user they may need to interact with the page first
          console.log('User may need to interact with the page to enable audio');
        });
      }
    }, 100);
  }

  // Method to manually enable audio (in case autoplay is blocked)
  enableAudio() {
    console.log('Manually enabling audio for all remote streams');
    this.remoteStreams.forEach((stream, username) => {
      const audioElement = document.getElementById(`audio-${username}`) as HTMLAudioElement;
      if (audioElement) {
        audioElement.play().then(() => {
          console.log('Successfully started playing audio for:', username);
        }).catch(error => {
          console.error('Failed to play audio for:', username, error);
        });
      }
    });
  }

  // Debug method to check audio elements
  debugAudioElements() {
    console.log('=== Audio Debug Info ===');
    console.log('Local stream:', this.localStream);
    if (this.localStream) {
      console.log('Local stream tracks:', this.localStream.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        readyState: t.readyState
      })));
    }
    
    console.log('Remote streams:', this.remoteStreams.size);
    this.remoteStreams.forEach((stream, username) => {
      console.log(`Remote stream for ${username}:`, stream.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        readyState: t.readyState
      })));
      const audioElement = document.getElementById(`audio-${username}`) as HTMLAudioElement;
      if (audioElement) {
        console.log(`Audio element for ${username}:`, {
          paused: audioElement.paused,
          volume: audioElement.volume,
          muted: audioElement.muted,
          currentTime: audioElement.currentTime,
          duration: audioElement.duration
        });
      }
    });
    
    console.log('Peer connections:', this.peerConnections.size);
    this.peerConnections.forEach((pc, username) => {
      console.log(`Peer connection for ${username}:`, {
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        iceGatheringState: pc.iceGatheringState,
        signalingState: pc.signalingState
      });
    });
    console.log('=== End Audio Debug ===');
  }

  // Utility methods for components
  isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  getConnectedMembersCount(): number {
    return this.vcMembers.length;
  }

  isCurrentUser(username: string): boolean {
    return username === this.getCurrentUsername();
  }

  requestVcMembers() {
    this.webSocketService.requestVcMembers();
  }
}
