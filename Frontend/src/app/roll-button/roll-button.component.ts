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
  
  @Output() resultRolled = new EventEmitter<string>();

  toggleRoll() {
    this.isOpen = !this.isOpen;
  }

  closeRoll() {
    this.isOpen = false;
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
      resultMessage = `You have rolled a ${roll} with a modifier of ${modifier >= 0 ? '+' + modifier : modifier} and got ${finalResult}`;
    }
    this.toggleRoll();
    this.resultRolled.emit(resultMessage);
  }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: HTMLElement) {
    const clickedInside = targetElement.closest('.roll-modal') || targetElement.closest('.roll-button');
    if (!clickedInside) {
      this.closeRoll();
    }
  }
}
