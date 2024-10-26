import { Component, Input, EventEmitter, Output  } from '@angular/core';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [],
  templateUrl: './board.component.html',
  styleUrl: './board.component.css'
})
export class BoardComponent {
  @Input() username: string | null = '';

  showPopup: boolean = false;
  rollResult: number = 0;
  @Output() resultRolled = new EventEmitter<string>();
  
  rollDice(event: Event) {
    const target = event.target as HTMLElement;
    let modifierString = target.innerText.trim(); // Get the text inside <p>
    let resultMessage = '';

    if (modifierString[0] === '(') {
      modifierString = modifierString.slice(1, -1); // Remove the first '(' and last ')' characters
    }
    
    const modifier = parseInt(modifierString, 10);  // Convert string to number
    const roll = Math.floor(Math.random() * 20) + 1;  // Roll a D20
    

    if (roll === 20) {
      resultMessage = 'Natural 20!';  // Ignore modifier
    } else if (roll === 1) {
      resultMessage = 'Natural 1...';  // Ignore modifier
    } else {
      const finalResult = roll + modifier;
      resultMessage = `You have rolled a ${roll} with a modifier of ${modifier >= 0 ? '+' + modifier : modifier} and got ${finalResult}`;
    }


    this.resultRolled.emit(resultMessage);
  }
}

