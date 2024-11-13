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
    shield?: number,
    photo?: string // Add photo property
  }[] = [];
  @Input() showInitiativePrompt: boolean = false;
  @Input() username: string | null = null;
  @Input() characterName: string | null = null;
  @Input() npcMaxHealth: number | null = null;
  @Input() currentTurnIndex: number | null = null; // Add Input property to receive current turn index
  @Input() role: string | null = null; // Add Input property to receive role

  modifierSign: string = '+';
  modifierValue: number = 0;

  mapImageUrl: string = `https://${localIP}:8080/assets/images/Map.jpg`;
  defaultIcon: string = `https://${localIP}:8080/assets/images/Default.png`;

  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private initialTop = 0;
  private initialLeft = 0;
  private initialTopRatio = 0;
  private initialLeftRatio = 0;
  private dragGroupElement: HTMLElement | null = null;
  private lastValidTop: number = 0;
  private lastValidLeft: number = 0;

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

  onDragStart(event: MouseEvent) {
    console.log("Drag started");
    const targetElement = (event.target as HTMLElement).closest('.draggable-group') as HTMLElement;
    const username = targetElement?.getAttribute('data-username');
    const user = this.activeBattleUsers.find(u => u.username === username);

    if (this.isDungeonMaster() || (user && user.characterName === this.characterName)) {
      this.isDragging = true;
      this.dragStartX = event.clientX;
      this.dragStartY = event.clientY;
      this.dragGroupElement = targetElement;
      if (this.dragGroupElement) {
        const rect = this.dragGroupElement.getBoundingClientRect();
        this.initialTop = rect.top;
        this.initialLeft = rect.left;
        this.initialTopRatio = this.initialTop / window.innerHeight;
        this.initialLeftRatio = this.initialLeft / window.innerWidth;
        this.dragGroupElement.style.top = `${this.initialTopRatio * 100}vh`;
        this.dragGroupElement.style.left = `${this.initialLeftRatio * 100}vw`;
      }
      event.preventDefault();
    }
  }

  onDrag(event: MouseEvent) {
    if (this.isDragging && this.dragGroupElement) {
      console.log("Dragging");
      const newTop = event.clientY - this.dragGroupElement.offsetHeight / 2;
      const newLeft = event.clientX - this.dragGroupElement.offsetWidth / 2;
      const mapElement = document.querySelector('.map-image') as HTMLElement;
      const mapRect = mapElement.getBoundingClientRect();

      // Check if the new position is within the map bounds
      if (newTop >= mapRect.top && newLeft >= mapRect.left && 
          newTop + this.dragGroupElement.offsetHeight <= mapRect.bottom && 
          newLeft + this.dragGroupElement.offsetWidth <= mapRect.right) {
        this.lastValidTop = newTop;
        this.lastValidLeft = newLeft;
      }

      this.dragGroupElement.style.top = `${newTop}px`;
      this.dragGroupElement.style.left = `${newLeft}px`;
    }
  }

  onDragEnd(event: MouseEvent) {
    console.log("Drag end");
    this.isDragging = false;
    if (this.dragGroupElement) {
      const mapElement = document.querySelector('.map-image') as HTMLElement;
      const mapRect = mapElement.getBoundingClientRect();
      const rect = this.dragGroupElement.getBoundingClientRect();

      let topRatio = (rect.top - mapRect.top) / mapRect.height;
      let leftRatio = (rect.left - mapRect.left) / mapRect.width;

      // Check if the group is outside the map borders
      if (rect.top < mapRect.top || rect.left < mapRect.left || 
          rect.bottom > mapRect.bottom || rect.right > mapRect.right) {
        // Place the group at the last valid position
        this.dragGroupElement.style.top = `${this.lastValidTop}px`;
        this.dragGroupElement.style.left = `${this.lastValidLeft}px`;
        topRatio = (this.lastValidTop - mapRect.top) / mapRect.height;
        leftRatio = (this.lastValidLeft - mapRect.left) / mapRect.width;
      }

      const user = this.activeBattleUsers.find(u => u.username === this.username);
      if (user || this.isDungeonMaster()) {
        this.webSocketService.updateUserPosition({
          username: this.dragGroupElement.getAttribute('data-username') || '',
          topRatio,
          leftRatio
        });
      }
    }
    this.dragGroupElement = null;
  }

  private isDungeonMaster(): boolean {
    return this.role === 'Dungeon Master';
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
        battleUser.photo = battleUser.photo || this.defaultIcon; // Use default icon if photo is empty
        console.log('Received health update for:', user.characterName);
        console.log('Current health:', user.currentHealth);
        console.log('Shield:', user.shield); // Log the shield value
      }
    });
    this.webSocketService.onUserPositionUpdate((data) => {
      const user = this.activeBattleUsers.find(u => u.username === data.username);
      if (user) {
        const element = document.querySelector(`.draggable-group[data-username="${user.username}"]`) as HTMLElement;
        const mapElement = document.querySelector('.map-image') as HTMLElement;
        const mapRect = mapElement.getBoundingClientRect();
        if (element) {
          element.style.top = `${mapRect.top + data.topRatio * mapRect.height}px`;
          element.style.left = `${mapRect.left + data.leftRatio * mapRect.width}px`;
        }
      }
    });
    this.webSocketService.onUserPositions((positions) => {
      positions.forEach(data => {
        const user = this.activeBattleUsers.find(u => u.username === data.username);
        if (user) {
          const element = document.querySelector(`.draggable-group[data-username="${user.username}"]`) as HTMLElement;
          const mapElement = document.querySelector('.map-image') as HTMLElement;
          const mapRect = mapElement.getBoundingClientRect();
          if (element) {
            element.style.top = `${mapRect.top + data.topRatio * mapRect.height}px`;
            element.style.left = `${mapRect.left + data.leftRatio * mapRect.width}px`;
          }
        }
      });
    });
    console.log('Initiative prompt listener set up');
    console.log(this.mapImageUrl)
  }

  private isUserInBattle(): boolean {
    return this.activeBattleUsers.some(user => user.username === this.username);
  }
}
