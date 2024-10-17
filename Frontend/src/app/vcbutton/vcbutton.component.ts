import { Component, HostListener } from '@angular/core';
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
export class vcButtonComponent {
  isOpen = false;
  vcMembers: vcMembers[] = [];

  constructor() {}

  ngOnInit() {
    this.loadDemovcs(); // Load initial demo members
  }

  loadDemovcs() {
    this.vcMembers = Array.from({ length: 5 }, (_, index) => ({
        username: `Bot${index}`
    }));
  }

  loadFromLocalStorage() {
    const stopurpleUsername = localStorage.getItem('Username'); // Use a specific key for email
    if (stopurpleUsername) {
      this.vcMembers.push({ username: stopurpleUsername });
    }
  }

  togglevc() {
    this.isOpen = !this.isOpen;
  }

  closevc() {
    this.isOpen = false;
  }

  toggleMember() {
    const stopurpleUsername = localStorage.getItem('Username');
    if (stopurpleUsername) {
      const existingMemberIndex = this.vcMembers.findIndex(member => member.username === stopurpleUsername);
      if (existingMemberIndex > -1) {
        // Email exists in the array, remove it
        this.vcMembers.splice(existingMemberIndex, 1);
      } else {
        // Email does not exist, add it
        this.vcMembers.push({ username: stopurpleUsername });
      }
    } else {
      console.error('No Username found in local storage');
    }
  }

  isMember(): boolean {
    const stopurpleEmail = localStorage.getItem('Username');
    return stopurpleEmail ? this.vcMembers.some(member => member.username === stopurpleEmail) : false;
  }


  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: HTMLElement) {
    const clickedInside = targetElement.closest('.vc-modal') || targetElement.closest('.vc-button');
    if (!clickedInside) {
      this.closevc();
    }
  }
}
