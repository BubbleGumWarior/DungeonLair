import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebSocketService } from '../services/websocket.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-battle-area',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './battle-area.component.html',
  styleUrls: ['./battle-area.component.css']
})
export class BattleAreaComponent implements OnInit {
  @Input() activeBattleUsers: { username: string, characterName: string, initiative: { random: number, modifier: number, final: number } }[] = [];
  @Input() showInitiativePrompt: boolean = false;
  @Input() username: string | null = null;
  @Input() characterName: string | null = null;

  modifierSign: string = '+';
  modifierValue: number = 0;

  constructor(private webSocketService: WebSocketService) {}

  rollForInitiative() {
    const random = Math.floor(Math.random() * 20) + 1;
    const modifier = this.modifierSign === '+' ? this.modifierValue : -this.modifierValue;
    const final = random + modifier;
    if (this.username && this.characterName) {
      console.log('Rolling for initiative:', { username: this.username, characterName: this.characterName, initiative: { random, modifier, final } });
      this.webSocketService.joinBattle({ username: this.username, characterName: this.characterName, initiative: { random, modifier, final } });
    }
    this.showInitiativePrompt = false;
  }

  spectate() {
    this.showInitiativePrompt = false;
    if (this.username && this.characterName) {
      this.webSocketService.leaveBattle({ username: this.username, characterName: this.characterName });
    }
  }

  getAbs(value: number): number {
    return Math.abs(value);
  }

  ngOnInit() {
    console.log('Setting up initiative prompt listener');
    this.webSocketService.onInitiativePrompt(() => {
      console.log('Received initiative prompt');
      if (!this.isUserInBattle()) {
        this.showInitiativePrompt = true;
      }
    });
    this.webSocketService.getActiveBattleUsers().subscribe(users => {
      this.activeBattleUsers = users;
    });
    console.log('Initiative prompt listener set up');
  }

  private isUserInBattle(): boolean {
    return this.activeBattleUsers.some(user => user.username === this.username);
  }
}
