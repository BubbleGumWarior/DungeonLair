import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebSocketService } from '../services/websocket.service';
import { FormsModule } from '@angular/forms';
import { localIP } from '../config'; // Import localIP from config
import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations'; // Import Angular animations

@Component({
  selector: 'app-battle-area',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './battle-area.component.html',
  styleUrls: ['./battle-area.component.css'],
  animations: [
    trigger('growWidth', [
      state('void', style({ width: '0%' })),
      state('*', style({ width: '*' })),
      transition('void => *', animate('500ms ease-in-out')),
      transition('* => void', animate('500ms ease-in-out')) // Add transition for disappearing
    ]),
    trigger('listAnimation', [
      transition('* <=> *', [
        style({ transform: 'translateY(0)' }),
        animate('500ms ease-in-out', style({ transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class BattleAreaComponent implements OnInit {
  @Input() activeBattleUsers: { 
    username: string, 
    characterName: string, 
    initiative: { random: number, modifier: number, final: number }, 
    isEnemy?: boolean, 
    maxHealth?: number, 
    currentHealth?: number,
    shield?: number // Add shield property
  }[] = [];
  @Input() showInitiativePrompt: boolean = false;
  @Input() username: string | null = null;
  @Input() characterName: string | null = null;
  @Input() npcMaxHealth: number | null = null;
  @Input() currentTurnIndex: number | null = null; // Add Input property to receive current turn index

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

  getHealthBarColor(healthPercentage: number): string {
    if (healthPercentage > 0.5) {
      const yellowToGreen = (healthPercentage - 0.5) * 2;
      return `rgb(${Math.floor(255 * (1 - yellowToGreen))}, 255, 0)`;
    } else {
      const redToYellow = healthPercentage * 2;
      return `rgb(255, ${Math.floor(255 * redToYellow)}, 0)`;
    }
  }

  getShieldBarColor(): string {
    return 'rgb(0, 0, 255)'; // Blue color for shield
  }

  getShieldBars(shield: number, maxHealth: number): { width: number }[] {
    const shieldBars = [];
    while (shield > 0) {
      const width = Math.min((shield / maxHealth) * 100, 100);
      shieldBars.push({ width });
      shield -= maxHealth;
    }
    return shieldBars;
  }

  trackByIndex(index: number, item: any): number {
    return index;
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
        battleUser.shield = user.shield; // Update shield value
        console.log('Received health update for:', user.characterName);
        console.log('Current health:', user.currentHealth);
        console.log('Shield:', user.shield); // Log the shield value
      }
    });
    console.log('Initiative prompt listener set up');
    console.log(this.mapImageUrl)
  }

  private isUserInBattle(): boolean {
    return this.activeBattleUsers.some(user => user.username === this.username);
  }
}
