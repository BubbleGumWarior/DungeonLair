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

  diceSizeText: string = '';
  modifierValueText: string = '';

  onSubmit() {
    localStorage.setItem('diceSizeText', this.diceSizeText);
    localStorage.setItem('modifierValueText', this.modifierValueText);
    localStorage.setItem('Username', "TestUser");
  }

  rollDice() {
    const diceSizeText = this.diceSizeText;
    const modifierValueText = this.modifierValueText;

    let diceSize = diceSizeText;

    if (diceSizeText[0] === 'd') {
      diceSize = diceSizeText.slice(1, diceSizeText.length);
    }
    if (modifierValueText[0] === '+' || modifierValueText[0] === '-') {

      let resultMessage = '';

      const diceRoll = parseInt(diceSize, 10); 
      
      const modifier = parseInt(modifierValueText, 10);  // Convert string to number
      const roll = Math.floor(Math.random() * diceRoll) + 1;  // Roll a dice
      
      console.log(diceSize)
      if (roll === diceRoll) {
        resultMessage = `Critical ${diceRoll}!!!`;  // Ignore modifier
      } else if (roll === 1) {
        resultMessage = 'Natural 1...';  // Ignore modifier
      } else {
        const finalResult = roll + modifier;
        resultMessage = `You have rolled a ${roll} with a modifier of ${modifier >= 0 ? '+' + modifier : modifier} and got ${finalResult}`;
      }

      console.log(resultMessage)
      this.toggleRoll()
      this.resultRolled.emit(resultMessage);
      }    
    }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: HTMLElement) {
    const clickedInside = targetElement.closest('.roll-modal') || targetElement.closest('.roll-button');
    if (!clickedInside) {
      this.closeRoll();
    }
  }
}
