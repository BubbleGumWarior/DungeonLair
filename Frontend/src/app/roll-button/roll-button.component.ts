import { Component, HostListener, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule

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
  imports: [CommonModule, FormsModule]
})
export class RollButtonComponent {
  isOpen = false;
  rollHistory: RollMessage[] = [];
  isMobile: boolean = false;
  
  @Output() resultRolled = new EventEmitter<string>();
  @Output() openChat = new EventEmitter<void>(); // Add an event to notify the parent to open the chat

  toggleRoll() {
    this.isOpen = !this.isOpen;
  }

  closeRoll() {
    this.isOpen = false;
  }

  ngOnInit() {
    this.isMobile = window.innerWidth <= 768; // Check if the user is on a mobile device
  }

  diceSizeText: string = '20';
  modifierValueText: string = '0';
  
  rollDice() {
    const diceSizeText = this.diceSizeText;
    const modifierValueText = this.modifierValueText;

    // Ensure diceSizeText contains only numbers
    if (!/^\d+$/.test(diceSizeText)) {
      alert('Dice size must be a number');
      return;
    }

    // Convert diceSizeText and modifierValueText to numbers
    const diceSize = parseInt(diceSizeText, 10);
    const modifier = parseInt(modifierValueText, 10);

    if (isNaN(diceSize) || isNaN(modifier)) {
      alert('Invalid input');
      return;
    }

    let resultMessage = '';

    const roll = Math.floor(Math.random() * diceSize) + 1;  // Roll a dice
    if (roll === diceSize) {
      resultMessage = `Critical ${diceSize}!!!`;  // Ignore modifier
    } else if (roll === 1) {
      resultMessage = 'Natural 1...';  // Ignore modifier
    } else {
      const finalResult = roll + modifier;
      resultMessage = `has rolled a ${roll} with a modifier of ${modifier >= 0 ? '+' + modifier : modifier} and got ${finalResult}`;
    }
    this.resultRolled.emit(resultMessage);
    this.closeRoll(); // Close the modal
    this.openChat.emit(); // Notify the parent to open the chat
  }

  flipCoin() {
    const coinElement = document.getElementById('coin');
    if (!coinElement) return;

    const flipResult = Math.random();
    coinElement.className = ''; // Reset classes
    setTimeout(() => {
        if (flipResult <= 0.5) {
            coinElement.classList.add('heads');
            setTimeout(() => {
                this.resultRolled.emit('flipped a coin and got Heads');
                this.closeRoll(); // Close the modal
                this.openChat.emit(); // Notify the parent to open the chat
            }, 3000); // Emit after animation
        } else {
            coinElement.classList.add('tails');
            setTimeout(() => {
                this.resultRolled.emit('flipped a coin and got Tails');
                this.closeRoll(); // Close the modal
                this.openChat.emit(); // Notify the parent to open the chat
            }, 3000); // Emit after animation
        }
    }, 100);
  }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: HTMLElement) {
    const clickedInside = targetElement.closest('.roll-modal') || targetElement.closest('.roll-button');
    if (!clickedInside) {
      this.closeRoll();
    }
  }
}
