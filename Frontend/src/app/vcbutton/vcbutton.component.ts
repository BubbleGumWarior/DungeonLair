import { Component, HostListener, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface vcMembers {
  username: string;
}

@Component({
  selector: 'app-vc-button',
  standalone: true,
  templateUrl: './vcbutton.component.html',
  styleUrls: ['./vcbutton.component.css'],
  imports: [CommonModule]
})
export class vcButtonComponent implements OnInit {
  isOpen = false;
  vcMembers: vcMembers[] = [];
  @Input() username: string = 'User';

  constructor() {}

  ngOnInit() {
    this.loadDemovcs(); // Load initial demo members
    // Remove loadFromInputUsername from ngOnInit to prevent auto-joining
  }

  loadDemovcs() {
    this.vcMembers = Array.from({ length: 5 }, (_, index) => ({
      username: `Bot${index}`
    }));
  }

  togglevc() {
    this.isOpen = !this.isOpen;
  }

  closevc() {
    this.isOpen = false;
  }

  toggleMember() {
    if (this.username) {
      const existingMemberIndex = this.vcMembers.findIndex(member => member.username === this.username);
      if (existingMemberIndex > -1) {
        // Username exists in the array, remove it
        this.vcMembers.splice(existingMemberIndex, 1);
      } else {
        // Username does not exist, add it
        this.vcMembers.push({ username: this.username });
      }
    } else {
      console.error('No Username provided');
    }
  }

  isMember(): boolean {
    return this.vcMembers.some(member => member.username === this.username);
  }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: HTMLElement) {
    const clickedInside = targetElement.closest('.vc-modal') || targetElement.closest('.vc-button');
    if (!clickedInside) {
      this.closevc();
    }
  }
}
