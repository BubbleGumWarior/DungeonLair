import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { HttpClientModule, HttpClient } from '@angular/common/http'; // Import HttpClientModule and HttpClient
import { localIP } from '../config'; // Import localIP from config
import { WebSocketService } from '../services/websocket.service'; // Import WebSocketService
import { ChatButtonComponent } from '../chat-button/chat-button.component'; // Import ChatButtonComponent
import { jwtDecode } from 'jwt-decode'; // Import jwtDecode

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
  showEndCombatModal: boolean = false; // Add showEndCombatModal property
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
  usersInBattle: { username: string, characterName: string, initiative: number, maxHealth: number, currentHealth: number, isEnemy: boolean, isCurrentTurn?: boolean, photo?: string, positionX?: number, positionY?: number, isHovered?: boolean, isReadied?: boolean }[] = []; // Add positionX and positionY properties and isHovered property and isReadied property
  characters: { name: string, photo: string }[] = [];
  sortedUsersInBattle: { username: string, characterName: string, initiative: number, maxHealth: number, currentHealth: number, isEnemy: boolean, isCurrentTurn?: boolean, photo?: string, positionX?: number, positionY?: number, isHovered?: boolean, isReadied?: boolean }[] = []; // Add sortedUsersInBattle property
  alphabeticallySortedUsersInBattle: { username: string, characterName: string, initiative: number, maxHealth: number, currentHealth: number, isEnemy: boolean, isCurrentTurn?: boolean, photo?: string, positionX?: number, positionY?: number, isHovered?: boolean, isReadied?: boolean }[] = []; // Add alphabeticallySortedUsersInBattle property
  diceResult: string = ''; // Add diceResult property
  galleryImages: any[] = []; // Add property to store gallery images
  combatStats: { [username: string]: { damageDealt: number, healed: number, shielded: number } } = {}; // Update combatStats property

  constructor(private route: ActivatedRoute, private router: Router, private webSocketService: WebSocketService, private http: HttpClient) {}

  ngOnInit() {
    this.loadDataFromToken(); // Load data from token
    this.route.queryParams.subscribe(params => {
      this.maxHealth = +params['maxHealth'];
      this.currentHealth = +params['currentHealth'];
    });
    this.webSocketService.onBattleUpdate((data) => {
      this.usersInBattle = data.usersInBattle.map((user: { username: string, characterName: string, initiative: number, maxHealth: number, currentHealth: number, isEnemy: boolean, isCurrentTurn?: boolean, photo?: string, positionX?: number, positionY?: number, isHovered?: boolean, isReadied?: boolean }) => ({
        ...user,
        isHovered: false // Initialize isHovered to false
      }));
      this.sortedUsersInBattle = [...this.usersInBattle].sort((a, b) => b.initiative - a.initiative); // Sort by initiative (highest to lowest)
      this.alphabeticallySortedUsersInBattle = [...this.usersInBattle].sort((a, b) => a.characterName.localeCompare(b.characterName)); // Sort alphabetically by characterName
      this.turnCounter = data.turnCounter;
      this.currentTurnIndex = data.currentTurnIndex;

      // Highlight the current turn
      this.highlightCurrentTurn();

      // Log the current turn
      if (this.currentTurnIndex !== null) {
      }
    });
    this.webSocketService.requestBattleState(); // Request initial battle state from the server
    this.fetchCharacterNames();
    this.fetchGalleryImages(); // Fetch gallery images on initialization
    this.webSocketService.onCombatAction((data) => {
      this.updateCombatStats(data.action, data.target, data.value, data.username);
    });
    this.webSocketService.onCombatStats((stats) => {
      this.combatStats = stats;
    });
    window.addEventListener('endCombat', () => {
      this.webSocketService.requestCombatStats(); // Request combat stats before showing the modal
    });
    this.webSocketService.onEndCombat(() => {
      this.showEndCombatModal = true; // Show the modal after receiving the end combat event
    });
  }

  loadDataFromToken() {
    const token = localStorage.getItem('token'); // Get the JWT from localStorage
    if (token) {
      try {
        const decoded: any = jwtDecode(token); // Decode the JWT
        this.username = decoded.username; // Extract the username
        this.characterName = decoded.characterName;
        this.role = decoded.role; // Extract the role
      } catch (error) {
        console.error('Failed to decode token:', error);
      }
    }
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

  async fetchGalleryImages() {
    this.galleryImages = await this.webSocketService.fetchGalleryImages();
  }

  closeBattleMap() {
    this.router.navigate(['/']);
  }

  getUserPhoto(characterName: string): string {
    const character = this.characters.find(char => char.name === characterName);
    return character && character.photo ? `url(${character.photo})` : `url(${this.defaultIcon})`;
  }

  getUserPhotoUrl(characterName: string): string {
    const galleryImage = this.galleryImages.find(image => image.imageName === characterName);
    if (galleryImage) {
      return `https://${localIP}:8080${galleryImage.photo}`;
    }
    const character = this.characters.find(char => char.name === characterName);
    return character && character.photo ? character.photo : this.defaultIcon;
  }

  joinBattle() {
    if (this.username && this.characterName && this.maxHealth !== null && this.currentHealth !== null) {
      const userIndex = this.usersInBattle.findIndex(user => user.username === this.username);
      if (userIndex === -1) {
        const initiative = Math.floor(Math.random() * 20) + 1;
        const photo = this.getUserPhotoUrl(this.characterName);
        const positionX = Math.random() * 100; // Random position for demonstration
        const positionY = Math.random() * 100; // Random position for demonstration
        this.usersInBattle.push({ username: this.username, characterName: this.characterName, initiative, maxHealth: this.maxHealth, currentHealth: this.currentHealth, isEnemy: false, photo, positionX, positionY });
      } else {
        this.usersInBattle.splice(userIndex, 1);
      }
      this.sortedUsersInBattle = [...this.usersInBattle].sort((a, b) => b.initiative - a.initiative); // Sort by initiative (highest to lowest)
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
      const photo = this.getUserPhotoUrl(this.npcName);
      const positionX = Math.random() * 100; // Random position for demonstration
      const positionY = Math.random() * 100; // Random position for demonstration

      // Check if NPC name already exists and rename if necessary
      let npcName = this.npcName;
      let count = 1;
      while (this.usersInBattle.some(user => user.characterName === npcName)) {
        npcName = `${this.npcName} ${count}`;
        count++;
      }

      this.usersInBattle.push({ username: npcName, characterName: npcName, initiative, maxHealth: this.npcMaxHealth, currentHealth: this.npcCurrentHealth, isEnemy: this.npcIsEnemy, photo, positionX, positionY });
      this.sortedUsersInBattle = [...this.usersInBattle].sort((a, b) => b.initiative - a.initiative); // Sort by initiative (highest to lowest)
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
    this.alphabeticallySortedUsersInBattle = [...this.usersInBattle].sort((a, b) => a.characterName.localeCompare(b.characterName)); // Ensure the list is sorted alphabetically
  }

  closeCombatActionsModal() {
    this.showCombatActionsModal = false;
    this.combatAction = 'Take Damage';
    this.combatTarget = '';
    this.combatValue = null;
  }

  performCombatAction() {
    const targetUser = this.usersInBattle.find(user => user.characterName === this.combatTarget);
    if (targetUser && this.currentTurnIndex !== null) {
      const currentUser = this.sortedUsersInBattle[this.currentTurnIndex];
      if (this.combatAction === 'Take Damage' && this.combatValue !== null) {
        targetUser.currentHealth = Math.max(0, targetUser.currentHealth - this.combatValue);
        this.webSocketService.sendCombatAction('Take Damage', this.combatTarget, this.combatValue, currentUser.username);
        this.updateCombatStats('Take Damage', this.combatTarget, this.combatValue, currentUser.username);
      } else if ((this.combatAction === 'Heal' || this.combatAction === 'Shield') && this.combatValue !== null) {
        targetUser.currentHealth = Math.min(targetUser.maxHealth, targetUser.currentHealth + this.combatValue);
        this.webSocketService.sendCombatAction(this.combatAction, this.combatTarget, this.combatValue, currentUser.username);
        this.updateCombatStats(this.combatAction, this.combatTarget, this.combatValue, currentUser.username);
      } else if (this.combatAction === 'Set Readied') {
        targetUser.isReadied = true;
      }
      this.closeCombatActionsModal();
      this.webSocketService.sendBattleUpdate({
        usersInBattle: this.usersInBattle,
        turnCounter: this.turnCounter,
        currentTurnIndex: this.currentTurnIndex
      });
    }
  }

  updateCombatStats(action: string, target: string, value: number, username: string) {
    if (!username) return; // Ensure username is defined
    if (!this.combatStats[username]) {
      this.combatStats[username] = { damageDealt: 0, healed: 0, shielded: 0 };
    }
    if (action === 'Take Damage') {
      this.combatStats[username].damageDealt += value;
    } else if (action === 'Heal') {
      this.combatStats[username].healed += value;
    } else if (action === 'Shield') {
      this.combatStats[username].shielded += value;
    }
    this.webSocketService.sendCombatStats(this.combatStats); // Send updated stats to the server
  }

  getCombatStatsKeys() {
    const keys = Object.keys(this.combatStats);
    console.log("Raw___________");
    console.log(keys);
    console.log(keys.indexOf('undefined'));
    console.log("Raw___________");
    const totalIndex = keys.indexOf('undefined');
    if (totalIndex !== -1) {
      console.log("totalIndex !== -1___________");
      console.log(keys.sort());
      console.log("totalIndex !== -1___________");
      return keys.sort();
    }
    else{
      console.log("Else___________");
      console.log(keys.filter(key => key !== 'Total').sort().concat('Total'));
      console.log("Else___________");
      return keys.filter(key => key !== 'Total').sort().concat('Total');
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
      let nextTurnIndex = this.currentTurnIndex;
      do {
        nextTurnIndex = (nextTurnIndex + 1) % this.sortedUsersInBattle.length;
      } while (this.sortedUsersInBattle[nextTurnIndex].currentHealth === 0 && nextTurnIndex !== this.currentTurnIndex);

      if (nextTurnIndex !== this.currentTurnIndex) {
        this.currentTurnIndex = nextTurnIndex;
        this.highlightCurrentTurn();
      }
    }
  }

  highlightCurrentTurn() {
    this.sortedUsersInBattle.forEach((user, index) => {
      user.isCurrentTurn = index === this.currentTurnIndex;
      if (user.isCurrentTurn) {
        user.isReadied = false; // Remove the readied state when the user's turn starts
      }
    });
  }

  endCombat() {
    this.webSocketService.sendCombatStats(this.combatStats); // Send final stats to the server
    this.webSocketService.endCombat();
  }

  closeEndCombatModal() {
    this.showEndCombatModal = false;
  }

  handleDiceResult(result: string) {
    this.diceResult = result; // Update the result when emitted
  }

  startDrag(event: MouseEvent, user: any) {
    if (this.role === 'Dungeon Master' || (user.username === this.username && this.isCurrentUserTurn())) {
      event.preventDefault();
      const onMouseMove = (e: MouseEvent) => this.dragging(e, user);
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        this.webSocketService.sendBattleUpdate({
          usersInBattle: this.usersInBattle,
          turnCounter: this.turnCounter,
          currentTurnIndex: this.currentTurnIndex
        });
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }
  }

  dragging(event: MouseEvent, user: any) {
    const mapElement = document.querySelector('.map-container');
    if (mapElement) {
      const rect = mapElement.getBoundingClientRect();
      user.positionX = ((event.clientX - rect.left) / rect.width) * 100;
      user.positionY = ((event.clientY - rect.top) / rect.height) * 100;
      this.webSocketService.sendBattleUpdate({
        usersInBattle: this.usersInBattle,
        turnCounter: this.turnCounter,
        currentTurnIndex: this.currentTurnIndex
      });
    }
  }
}
