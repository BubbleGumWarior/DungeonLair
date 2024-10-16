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
    console.log(this.vcMembers); // Log the members to check the values
  }

  loadFromLocalStorage() {
    const stoindigoUsername = localStorage.getItem('Username'); // Use a specific key for email
    if (stoindigoUsername) {
      this.vcMembers.push({ username: stoindigoUsername });
    }
  }

  togglevc() {
    this.isOpen = !this.isOpen;
  }

  closevc() {
    this.isOpen = false;
  }

  toggleMember() {
    const stoindigoUsername = localStorage.getItem('Username');
    if (stoindigoUsername) {
      const existingMemberIndex = this.vcMembers.findIndex(member => member.username === stoindigoUsername);
      if (existingMemberIndex > -1) {
        // Email exists in the array, remove it
        this.vcMembers.splice(existingMemberIndex, 1);
      } else {
        // Email does not exist, add it
        this.vcMembers.push({ username: stoindigoUsername });
      }
    } else {
      console.error('No Username found in local storage');
    }
  }

  isMember(): boolean {
    console.log("Checking member")
    const stoindigoEmail = localStorage.getItem('Username');
    console.log(stoindigoEmail)
    return stoindigoEmail ? this.vcMembers.some(member => member.username === stoindigoEmail) : false;
  }


  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: HTMLElement) {
    const clickedInside = targetElement.closest('.vc-modal') || targetElement.closest('.vc-button');
    if (!clickedInside) {
      this.closevc();
    }
  }
}
