import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

interface RollMessage {
  sender: string;
  message: string;
  timestamp: Date;
}

@Component({
  selector: 'app-roll-button',
  standalone: true,
  templateUrl: './roll-button.component.html',
  styleUrls: ['./roll-button.component.css'],
  imports: [CommonModule]
})
export class RollButtonComponent {
  isOpen = false;
  rollHistory: RollMessage[] = [];

  toggleRoll() {
    this.isOpen = !this.isOpen;
  }

  closeRoll() {
    this.isOpen = false;
  }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: HTMLElement) {
    const clickedInside = targetElement.closest('.roll-modal') || targetElement.closest('.roll-button');
    if (!clickedInside) {
      this.closeRoll();
    }
  }
}
