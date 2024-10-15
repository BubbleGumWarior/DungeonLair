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

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, BoardComponent, FamilyComponent, FriendsComponent, InventoryComponent, SkillsComponent, NotesComponent, ChatButtonComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  constructor(private router: Router) {}

  email: string | null = '';

  ngOnInit() {
    this.email = localStorage.getItem('Email');
    if (!this.email) {
      this.router.navigate(['/login']);
    }
  }

  currentView: string = 'home'; // Default view

  navigateView(view: string) {
    this.currentView = view;
  }

  navigateTo(route: string) {
    console.log(route)
    if (route == 'login') {      
      localStorage.clear()
    }
    this.router.navigate([route]);
  }
}
