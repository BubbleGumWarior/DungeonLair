import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebSocketService } from '../services/websocket.service';
import { FormsModule } from '@angular/forms';
import { localIP } from '../config'; // Import the IP address

@Component({
  selector: 'app-battle-area',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './battle-area.component.html',
  styleUrls: ['./battle-area.component.css']
})
export class BattleAreaComponent implements OnInit {
  @Input() activeBattleUsers: { username: string, characterName: string, initiative: { random: number, modifier: number, final: number }, isEnemy?: boolean, maxHealth?: number, currentHealth?: number }[] = [];
  @Input() showInitiativePrompt: boolean = false;
  @Input() username: string | null = null;
  @Input() characterName: string | null = null;
  @Input() npcMaxHealth: number | null = null;

  modifierSign: string = '+';
  modifierValue: number = 0;

  mapImageUrl: string = `https://${localIP}:8080/assets/images/Map.jpg`;

  constructor(private webSocketService: WebSocketService) {}

  rollForInitiative() {
    const random = Math.floor(Math.random() * 20) + 1;
    const modifier = this.modifierSign === '+' ? this.modifierValue : -this.modifierValue;
    const final = random + modifier;
    if (this.username && this.characterName) {
      const initiativeData: any = { username: this.username, characterName: this.characterName, initiative: { random, modifier, final } };
      console.log('Rolling for initiative:', initiativeData);
      this.webSocketService.joinBattle(initiativeData);
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
    this.webSocketService.onHealthUpdate((user) => {
      const battleUser = this.activeBattleUsers.find(u => u.username === user.username);
      if (battleUser) {
        battleUser.currentHealth = user.currentHealth;
      }
    });
    console.log('Initiative prompt listener set up');
    console.log(this.mapImageUrl)
  }

  private isUserInBattle(): boolean {
    return this.activeBattleUsers.some(user => user.username === this.username);
  }
}
