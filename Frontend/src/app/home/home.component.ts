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

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, BoardComponent, FamilyComponent, FriendsComponent, InventoryComponent, SkillsComponent, NotesComponent, ChatButtonComponent, RollButtonComponent, vcButtonComponent, SoundbarComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  diceResult: string = '';
  handleDiceResult(result: string) {
    this.diceResult = result;  // Update the result when emitted
  }
  
  constructor(private router: Router) {}

  username: string | null = 'DefaultUser';

  ngOnInit() {
    this.username = localStorage.getItem('Username');
    if (!this.username) {
      this.router.navigate(['/login']);
    }
  }

  currentView: string = 'home'; // Default view

  navigateView(view: string) {
    this.currentView = view;
  }

  navigateTo(route: string) {
    if (route == 'login') {      
      localStorage.clear()
    }
    this.router.navigate([route]);
  }
}
