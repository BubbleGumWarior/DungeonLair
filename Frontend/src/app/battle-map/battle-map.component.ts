import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { HttpClientModule, HttpClient } from '@angular/common/http'; // Import HttpClientModule and HttpClient
import { localIP } from '../config'; // Import localIP from config
import { WebSocketService } from '../services/websocket.service'; // Import WebSocketService
import { ChatButtonComponent } from '../chat-button/chat-button.component'; // Import ChatButtonComponent

@Component({
  selector: 'app-battle-map',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, ChatButtonComponent], // Add CommonModule, FormsModule, HttpClientModule, and ChatButtonComponent to imports
  templateUrl: './battle-map.component.html',
  styleUrls: ['./battle-map.component.css']
})
export class BattleMapComponent implements OnInit {
  characterName: string | null = null;
  username: string | null = null;
  maxHealth: number | null = null;
  currentHealth: number | null = null;
  role: string | null = null;
  showAddNPCModal: boolean = false;
  showCombatActionsModal: boolean = false;
  showKillTargetModal: boolean = false;
  npcName: string = '';
  npcMaxHealth: number | null = null;
  npcCurrentHealth: number | null = null;
  npcIsEnemy: boolean = false;
  npcInitiative: number | null = null;
  combatAction: string = 'Take Damage';
  combatTarget: string = '';
  combatValue: number | null = null;
  killTargetName: string = '';
  defaultIcon: string = `https://${localIP}:8080/assets/images/Default.png`; // Add defaultIcon property
  mapUrl: string = `https://${localIP}:8080/assets/images/Map.jpg`;
  turnCounter: number | null = null; // Add turnCounter property
  currentTurnIndex: number | null = null; // Add currentTurnIndex property
  usersInBattle: { username: string, characterName: string, initiative: number, maxHealth: number, currentHealth: number, isEnemy: boolean, isCurrentTurn?: boolean, photo?: string }[] = []; // Remove initial values
  characters: { name: string, photo: string }[] = [];
  diceResult: string = ''; // Add diceResult property

  constructor(private route: ActivatedRoute, private router: Router, private webSocketService: WebSocketService, private http: HttpClient) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.characterName = params['characterName'];
      this.username = params['username'];
      this.maxHealth = +params['maxHealth'];
      this.currentHealth = +params['currentHealth'];
      this.role = params['role'];
    });
    this.webSocketService.onBattleUpdate((data) => {
      this.usersInBattle = data.usersInBattle;
      this.turnCounter = data.turnCounter;
      this.currentTurnIndex = data.currentTurnIndex;
    });
    this.webSocketService.requestBattleState(); // Request initial battle state from the server
    this.fetchCharacterNames();
  }

  fetchCharacterNames() {
    this.http.get<{ characterName: string, photo: string }[]>(`https://${localIP}:8080/character-names`).subscribe(
      (data) => {
        this.characters = data
          .map(character => ({
            name: character.characterName,
            photo: character.photo ? `https://${localIP}:8080${character.photo}` : ''
          }))
          .sort((a, b) => a.name.localeCompare(b.name)); // Sort characters alphabetically by name
      },
      (error) => {
        console.error('Error fetching character names:', error);
      }
    );
  }

  closeBattleMap() {
    this.router.navigate(['/']);
  }

  getUserPhoto(characterName: string): string {
    const character = this.characters.find(char => char.name === characterName);
    return character && character.photo ? `url(${character.photo})` : `url(${this.defaultIcon})`;
  }

  joinBattle() {
    if (this.username && this.characterName && this.maxHealth !== null && this.currentHealth !== null) {
      console.log('Joining battle with maxHealth:', this.maxHealth, 'and currentHealth:', this.currentHealth);
      const userIndex = this.usersInBattle.findIndex(user => user.username === this.username);
      if (userIndex === -1) {
        const initiative = Math.floor(Math.random() * 20) + 1;
        const character = this.characters.find(char => char.name === this.characterName);
        const photo = character ? character.photo : '';
        this.usersInBattle.push({ username: this.username, characterName: this.characterName, initiative, maxHealth: this.maxHealth, currentHealth: this.currentHealth, isEnemy: false, photo });
        console.log('User joined battle:', this.username, 'with initiative:', initiative);
      } else {
        this.usersInBattle.splice(userIndex, 1);
        console.log('User left battle:', this.username);
      }
      this.usersInBattle.sort((a, b) => b.initiative - a.initiative); // Sort by initiative
      this.webSocketService.sendBattleUpdate({
        usersInBattle: this.usersInBattle,
        turnCounter: this.turnCounter,
        currentTurnIndex: this.currentTurnIndex
      });
    }
  }

  isUserInBattle(): boolean {
    return this.usersInBattle.some(user => user.username === this.username);
  }

  openAddNPCModal() {
    this.showAddNPCModal = true;
  }

  closeAddNPCModal() {
    this.showAddNPCModal = false;
    this.npcName = '';
    this.npcMaxHealth = null;
    this.npcCurrentHealth = null;
    this.npcIsEnemy = false;
    this.npcInitiative = null;
  }

  addNPC() {
    if (this.npcName && this.npcMaxHealth !== null && this.npcCurrentHealth !== null) {
      const initiative = this.npcInitiative !== null ? this.npcInitiative : Math.floor(Math.random() * 20) + 1;
      this.usersInBattle.push({ username: this.npcName, characterName: this.npcName, initiative, maxHealth: this.npcMaxHealth, currentHealth: this.npcCurrentHealth, isEnemy: this.npcIsEnemy });
      console.log('NPC added:', this.npcName, 'with initiative:', initiative);
      this.usersInBattle.sort((a, b) => b.initiative - a.initiative); // Sort by initiative
      this.closeAddNPCModal();
      this.webSocketService.sendBattleUpdate({
        usersInBattle: this.usersInBattle,
        turnCounter: this.turnCounter,
        currentTurnIndex: this.currentTurnIndex
      });
    }
  }

  openCombatActionsModal() {
    this.showCombatActionsModal = true;
  }

  closeCombatActionsModal() {
    this.showCombatActionsModal = false;
    this.combatAction = 'Take Damage';
    this.combatTarget = '';
    this.combatValue = null;
  }

  performCombatAction() {
    const targetUser = this.usersInBattle.find(user => user.characterName === this.combatTarget);
    if (targetUser && this.combatValue !== null) {
      if (this.combatAction === 'Take Damage') {
        targetUser.currentHealth = Math.max(0, targetUser.currentHealth - this.combatValue);
      } else if (this.combatAction === 'Heal' || this.combatAction === 'Shield') {
        targetUser.currentHealth = Math.min(targetUser.maxHealth, targetUser.currentHealth + this.combatValue);
      }
      console.log(`${this.combatAction} performed on ${targetUser.characterName} with value ${this.combatValue}`);
      this.closeCombatActionsModal();
      this.webSocketService.sendBattleUpdate({
        usersInBattle: this.usersInBattle,
        turnCounter: this.turnCounter,
        currentTurnIndex: this.currentTurnIndex
      });
    }
  }

  openKillTargetModal() {
    this.showKillTargetModal = true;
  }

  closeKillTargetModal() {
    this.showKillTargetModal = false;
    this.killTargetName = '';
  }

  killTarget() {
    if (this.killTargetName) {
      this.webSocketService.killTarget(this.killTargetName);
      this.closeKillTargetModal();
    }
  }

  startOrEndTurn() {
    if (this.role === 'Dungeon Master' || this.isCurrentUserTurn()) {
      if (this.turnCounter === null) {
        this.turnCounter = 1;
        this.currentTurnIndex = 0;
        this.highlightCurrentTurn();
      } else {
        this.advanceTurn();
      }
      this.webSocketService.sendBattleUpdate({
        usersInBattle: this.usersInBattle,
        turnCounter: this.turnCounter,
        currentTurnIndex: this.currentTurnIndex
      });
    }
  }

  isCurrentUserTurn(): boolean {
    return this.currentTurnIndex !== null && this.usersInBattle[this.currentTurnIndex].username === this.username;
  }

  advanceTurn() {
    if (this.currentTurnIndex !== null) {
      do {
        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.usersInBattle.length;
      } while (this.usersInBattle[this.currentTurnIndex].currentHealth === 0);
      this.highlightCurrentTurn();
    }
  }

  highlightCurrentTurn() {
    this.usersInBattle.forEach((user, index) => {
      user.isCurrentTurn = index === this.currentTurnIndex;
    });
  }

  endCombat() {
    console.log('Ending combat');
    this.usersInBattle = [];
    this.turnCounter = null;
    this.currentTurnIndex = null;
    this.webSocketService.endCombat();
  }

  handleDiceResult(result: string) {
    this.diceResult = result; // Update the result when emitted
  }
}
