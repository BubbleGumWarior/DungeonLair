import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { BoardComponent } from '../board/board.component';
import { FamilyComponent } from '../family/family.component';
import { FriendsComponent } from '../friends/friends.component';
import { InventoryComponent } from '../inventory/inventory.component';
import { SkillsComponent } from '../skills/skills.component';
import { NotesComponent } from '../notes/notes.component';
import { ChatButtonComponent } from '../chat-button/chat-button.component';
import { RollButtonComponent } from '../roll-button/roll-button.component';
import { vcButtonComponent } from '../vcbutton/vcbutton.component';
import { SoundbarComponent } from '../soundbar/soundbar.component';
import { DMScreenComponent } from '../dmscreen/dmscreen.component';
import { BattleAreaComponent } from '../battle-area/battle-area.component';
import { jwtDecode } from 'jwt-decode';
import { WebSocketService } from '../services/websocket.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, // Add FormsModule to imports
    BoardComponent,
    FamilyComponent,
    FriendsComponent,
    InventoryComponent,
    SkillsComponent,
    NotesComponent,
    ChatButtonComponent,
    RollButtonComponent,
    vcButtonComponent,
    SoundbarComponent,
    DMScreenComponent,
    BattleAreaComponent,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  diceResult: string = '';
  username: string | null = null; // Initialize username as null
  characterName: string | null = null;
  role: string | null = null; // Initialize role as null
  battleActive: boolean = false;
  showBattlePrompt: boolean = false;
  battleInitiatedByMe: boolean = false; // Flag to indicate if the battle was initiated by the current user
  activeBattleUsers: { username: string, characterName: string, initiative: { random: number, modifier: number, final: number }, isEnemy?: boolean }[] = [];
  showInitiativePrompt: boolean = false;
  showAddUserModal: boolean = false;
  addUserType: string = 'Player';
  selectedPlayer: string | null = null;
  npcName: string = '';
  isEnemy: boolean = false;
  availableUsers: { username: string }[] = [];

  constructor(private router: Router, private webSocketService: WebSocketService) {}

  ngOnInit() {
    this.loadDataFromToken();
    if (!this.username) {
      this.router.navigate(['/login']);
    }
    this.setupSocketListeners();
    this.webSocketService.onActiveBattleUsers((users: { username: string, characterName: string, initiative: { random: number, modifier: number, final: number } }[]) => {
      this.activeBattleUsers = users;
      console.log('Active battle users:', this.activeBattleUsers);
      if (this.isUserInBattle()) {
        this.showInitiativePrompt = false;
      }
    });
    this.loadAvailableUsers();
    // Log in the user upon initialization
    if (this.username && this.role) {
      console.log('Logging in user:', this.username, 'with role:', this.role);
      this.webSocketService.loginUser({ username: this.username, role: this.role });
    }
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

  handleDiceResult(result: string) {
    this.diceResult = result; // Update the result when emitted
  }

  currentView: string = 'home'; // Default view

  navigateView(view: string) {
    this.currentView = view;
  }

  navigateTo(route: string) {
    if (route === 'login') {
      localStorage.clear(); // Clear local storage on logout
    }
    this.router.navigate([route]);
  }

  setupSocketListeners() {
    this.webSocketService.onBattleStarted(() => {
      if (!this.battleInitiatedByMe) {
        this.showBattlePrompt = true;
      }
      this.battleInitiatedByMe = false; // Reset the flag after handling the event
    });
    this.webSocketService.onBattleEnded(() => {
      this.battleActive = false;
      this.showBattlePrompt = false;
    });
  }

  toggleBattle() {
    if (this.battleActive) {
      this.endBattle();
    } else {
      this.startBattle();
    }
  }

  startBattle() {
    this.battleActive = true; // Automatically join the battle
    this.battleInitiatedByMe = true; // Set the flag to indicate the battle was initiated by the current user
    this.webSocketService.startBattle();
  }

  endBattle() {
    this.battleActive = false;
    if (this.username && this.characterName) {
      this.webSocketService.leaveBattle({ username: this.username, characterName: this.characterName });
    }
    this.webSocketService.endBattle();
  }

  joinBattle() {
    this.battleActive = true;
    this.showBattlePrompt = false;
    this.showInitiativePrompt = true;
  }

  declineBattle() {
    this.showBattlePrompt = false;
  }

  loadAvailableUsers() {
    this.webSocketService.getAllCharacterNames().subscribe(characterNames => {
      this.availableUsers = characterNames
        .filter(character => !this.activeBattleUsers.some(battleUser => battleUser.characterName === character.characterName))
        .map(character => ({ username: character.characterName }));
    });
  }

  submitAddUser() {
    if (this.addUserType === 'Player' && this.selectedPlayer) {
      console.log('Sending initiative prompt to:', this.selectedPlayer);
      this.webSocketService.sendInitiativePrompt(this.selectedPlayer);
    } else if (this.addUserType === 'NPC' && this.npcName) {
      const random = Math.floor(Math.random() * 20) + 1;
      const initiative = {
        random,
        modifier: 0,
        final: random
      };
      const user: { username: string; characterName: string; initiative: { random: number; modifier: number; final: number }; isEnemy?: boolean } = {
        username: this.npcName,
        characterName: this.npcName,
        initiative
      };
      if (this.isEnemy) {
        user['isEnemy'] = true;
      }
      console.log('Adding NPC to battle:', user);
      this.webSocketService.joinBattle(user);
    }
    this.showAddUserModal = false;
  }

  private isUserInBattle(): boolean {
    return this.activeBattleUsers.some(user => user.username === this.username);
  }
}
