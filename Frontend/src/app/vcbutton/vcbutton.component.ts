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

  constructor(private http: HttpClient, private webSocketService: WebSocketService) {}

  ngOnInit() {
    this.webSocketService.onVcMembersUpdate((members: VcMember[]) => {
      this.vcMembers = members;
    });
    this.webSocketService.requestVcMembers(); // Request the current list of VC members
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  ngOnDestroy() {
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
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

  toggleMember() {
    if (this.isMember()) {
      this.webSocketService.removeVcMember(this.username);
    } else {
      this.webSocketService.addVcMember({ username: this.username });
    }
  }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: HTMLElement) {
    const clickedInside = targetElement.closest('.vc-modal') || targetElement.closest('.vc-button');
    if (!clickedInside) {
      this.closevc();
    }
  }
}
