import { Component, HostListener, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { WebSocketService } from '../services/websocket.service';
import { localIP } from '../config'; // Import the IP address

interface VcMember {
  username: string;
}

@Component({
  selector: 'app-vc-button',
  standalone: true,
  templateUrl: './vcbutton.component.html',
  styleUrls: ['./vcbutton.component.css'],
  imports: [CommonModule, HttpClientModule]
})
export class vcButtonComponent implements OnInit, OnDestroy {
  isOpen = false;
  vcMembers: VcMember[] = [];
  @Input() username: string = 'User';
  @Input() role: string = 'defaultRole'; // Add this line
  private localStream: MediaStream | null = null;
  private peerConnections: { [username: string]: RTCPeerConnection } = {};

  constructor(private http: HttpClient, private webSocketService: WebSocketService) {}

  ngOnInit() {
    this.webSocketService.onVcMembersUpdate((members: VcMember[]) => {
      this.vcMembers = members;
    });
    this.webSocketService.requestVcMembers(); // Request the current list of VC members
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    this.webSocketService.onRtcOffer(this.handleRtcOffer);
    this.webSocketService.onRtcAnswer(this.handleRtcAnswer);
    this.webSocketService.onRtcIceCandidate(this.handleRtcIceCandidate);
  }

  ngOnDestroy() {
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    this.closeLocalStream();
    this.closePeerConnections();
  }

  handleBeforeUnload = () => {
    if (this.isMember()) {
      this.webSocketService.removeVcMember(this.username);
    }
  };

  togglevc() {
    this.isOpen = !this.isOpen;
  }

  closevc() {
    this.isOpen = false;
  }

  isMember(): boolean {
    return this.vcMembers.some(member => member.username === this.username);
  }

  async toggleMember() {
    if (this.isMember()) {
      this.webSocketService.removeVcMember(this.username);
      this.closeLocalStream();
      this.closePeerConnections();
    } else {
      this.webSocketService.addVcMember({ username: this.username });
      await this.startLocalStream();
    }
  }

  private async startLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.localStream.getTracks().forEach(track => {
        for (const peerConnection of Object.values(this.peerConnections)) {
          peerConnection.addTrack(track, this.localStream!);
        }
      });
    } catch (error) {
      console.error('Error accessing local media:', error);
    }
  }

  private closeLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  private closePeerConnections() {
    for (const peerConnection of Object.values(this.peerConnections)) {
      peerConnection.close();
    }
    this.peerConnections = {};
  }

  private handleRtcOffer = async (username: string, offer: RTCSessionDescriptionInit) => {
    const peerConnection = this.createPeerConnection(username);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    this.webSocketService.sendRtcAnswer(username, answer);
  };

  private handleRtcAnswer = async (username: string, answer: RTCSessionDescriptionInit) => {
    const peerConnection = this.peerConnections[username];
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  private handleRtcIceCandidate = (username: string, candidate: RTCIceCandidateInit) => {
    const peerConnection = this.peerConnections[username];
    if (peerConnection) {
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  private createPeerConnection(username: string): RTCPeerConnection {
    const peerConnection = new RTCPeerConnection();
    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        this.webSocketService.sendRtcIceCandidate(username, event.candidate);
      }
    };
    peerConnection.ontrack = event => {
      // Handle remote stream
      const remoteAudio = new Audio();
      remoteAudio.srcObject = event.streams[0];
      remoteAudio.play();
    };
    this.localStream?.getTracks().forEach(track => {
      peerConnection.addTrack(track, this.localStream!);
    });
    this.peerConnections[username] = peerConnection;
    return peerConnection;
  }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: HTMLElement) {
    const clickedInside = targetElement.closest('.vc-modal') || targetElement.closest('.vc-button');
    if (!clickedInside) {
      this.closevc();
    }
  }
}
