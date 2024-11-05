import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
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

  constructor(private router: Router, private webSocketService: WebSocketService) {}

  ngOnInit() {
    this.loadDataFromToken();
    if (!this.username) {
      this.router.navigate(['/login']);
    }
    this.setupSocketListeners();
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
    this.webSocketService.endBattle();
  }

  joinBattle() {
    this.battleActive = true;
    this.showBattlePrompt = false;
  }

  declineBattle() {
    this.showBattlePrompt = false;
  }
}
