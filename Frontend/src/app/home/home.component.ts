import { Component } from '@angular/core';
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
import { jwtDecode } from 'jwt-decode';

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
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  diceResult: string = '';
  username: string | null = null; // Initialize username as null

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadUsernameFromToken();
    if (!this.username) {
      this.router.navigate(['/login']);
    }
  }

  loadUsernameFromToken() {
    const token = localStorage.getItem('token'); // Get the JWT from localStorage
    if (token) {
      try {
        const decoded: any = jwtDecode(token); // Decode the JWT
        this.username = decoded.username; // Extract the username
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
}
