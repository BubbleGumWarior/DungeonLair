import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { HttpClientModule, HttpClient } from '@angular/common/http'; // Import HttpClientModule and HttpClient
import { Router } from '@angular/router'; // Import Router
import { jwtDecode } from 'jwt-decode';
import { localIP } from '../config'; // Import the IP address
import { WebSocketService } from '../services/websocket.service'; // Import WebSocketService

@Component({
  selector: 'app-battle-area',
  standalone: true,
  imports: [CommonModule, HttpClientModule], // Add HttpClientModule to imports
  templateUrl: './battle-area.component.html',
  styleUrl: './battle-area.component.css'
})
export class BattleAreaComponent implements OnInit, OnDestroy {
  userInformation: any = null;
  maskInformation: any = null; // Add maskInformation variable
  masksInBattle: any[] = []; // Add masksInBattle array
  skills: any[] = []; // Add skills array
  showSkillsModal: boolean = false; // Add showSkillsModal flag
  selectedSkill: any = null; // Add selectedSkill variable
  showTargetBanner: boolean = false; // Add showTargetBanner flag
  selectedTargets: any[] = []; // Add selectedTargets array

  constructor(private http: HttpClient, private webSocketService: WebSocketService, private router: Router) { // Add Router to constructor
    this.webSocketService.onMasksInBattleUpdate((masks) => {
      this.masksInBattle = masks.sort((a, b) => b.currentSpeed - a.currentSpeed);
      this.fetchMaskPhotos(); // Fetch mask photos each time masksInBattle is updated
    });
  }

  ngOnInit() {
    this.loadUserInformationFromToken();
    document.addEventListener('click', this.closeModalOnClickOutside.bind(this)); // Add event listener
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.closeModalOnClickOutside.bind(this)); // Remove event listener
  }

  loadUserInformationFromToken() {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        this.userInformation = {
          username: decoded.username,
          role: decoded.role,
          characterName: decoded.characterName,
          maskID: null
        };
        this.fetchCharacterInfo(decoded.characterID);
      } catch (error) {
        console.error('Failed to decode token:', error);
      }
    }
  }

  fetchCharacterInfo(characterID: string) {
    this.http.get(`https://${localIP}:8080/character-info/${characterID}`)
      .subscribe(
        (data: any) => {
          this.userInformation.characterName = data.characterName;
          this.userInformation.maskID = data.maskID;
          console.log('Character info:', this.userInformation);
          if (data.maskID) {
            this.fetchMaskInfo(data.maskID);
          }
        },
        (error) => {
          console.error('Error fetching character info:', error);
        }
      );
  }

  fetchMaskInfo(maskID: number) {
    this.http.get(`https://${localIP}:8080/mask-details/${maskID}`)
      .subscribe(
        (data: any) => {
          this.maskInformation = {
            maskID: data.maskID,
            attackDamage: data.attackDamage,
            abilityDamage: data.abilityDamage,
            protections: data.protections,
            magicResist: data.magicResist,
            health: data.health,
            speed: data.speed,
            currentHealth: data.health,
            currentSpeed: data.speed
          };
          console.log('Mask info:', this.maskInformation);
        },
        (error) => {
          console.error('Error fetching mask info:', error);
        }
      );
  }

  fetchMaskPhotos() {
    this.masksInBattle.forEach(mask => {
      this.http.get(`https://${localIP}:8080/mask-details/${mask.maskID}`)
        .subscribe(
          (data: any) => {
            mask.photo = `https://${localIP}:8080${data.photo}`;
            console.log(mask.photo)
          },
          (error) => {
            console.error('Error fetching mask photo:', error);
          }
        );
    });
  }

  joinBattle() {
    if (this.userInformation.maskID) {
      this.webSocketService.joinBattle(this.userInformation.maskID);
    }
  }

  useMainAction() {
    if (!this.canUseMainAction()) {
      return; // Do nothing if the main action cannot be used
    }
    if (this.userInformation.maskID) {
      this.http.get(`https://${localIP}:8080/mask-skills/${this.userInformation.maskID}`)
        .subscribe(
          (skills: any) => {
            this.skills = skills;
            this.showSkillsModal = true; // Show the modal
          },
          (error) => {
            console.error('Error fetching mask skills:', error);
          }
        );
    }
  }

  canUseMainAction(): boolean {
    if (this.userInformation && this.userInformation.maskID) {
      const mask = this.masksInBattle.find(mask => mask.maskID === this.userInformation.maskID);
      return mask ? mask.action : false;
    }
    return false;
  }

  selectSkill(skill: any) {
    this.selectedSkill = skill;
    this.selectedTargets = []; // Reset selectedTargets
    this.showSkillsModal = false; // Close the modal
    this.showTargetBanner = true; // Show banner
  }

  selectTarget(mask: any) {
    if (this.selectedSkill) {
      if (this.selectedSkill.isMultiTarget) {
        this.selectedTargets.push(mask.maskID);
        if (this.selectedTargets.length >= this.selectedSkill.amountOfStrikes) {
          this.sendSkillAction();
        }
      } else {
        this.selectedTargets = Array(this.selectedSkill.amountOfStrikes).fill(mask.maskID);
        this.sendSkillAction();
      }
    }
  }

  sendSkillAction() {
    this.webSocketService.sendSkillAction(this.userInformation.maskID, this.selectedSkill.skillID, this.selectedTargets);
    this.selectedSkill = null; // Reset selectedSkill
    this.selectedTargets = []; // Reset selectedTargets
    this.showTargetBanner = false; // Hide banner
  }

  cancelSkillSelection() {
    this.selectedSkill = null; // Reset selectedSkill
    this.selectedTargets = []; // Reset selectedTargets
    this.showTargetBanner = false; // Hide banner
  }

  closeSkillsModal() {
    this.showSkillsModal = false; // Close the modal
  }

  closeModalOnClickOutside(event: MouseEvent) {
    const modal = document.querySelector('.skills-modal');
    if (this.showSkillsModal && modal && !modal.contains(event.target as Node)) {
      this.closeSkillsModal();
    }
  }

  continue() {
    this.http.post(`https://${localIP}:8080/continue`, {}).subscribe(
      () => console.log('Continue request sent successfully'),
      (error) => console.error('Error sending continue request:', error)
    );
  }

  leaveBattle() {
    this.router.navigate(['/']); // Navigate to the root route
  }

  getBorderColor(mask: any): string {
    if (mask.currentHealth === 0) {
      return 'border-red-700';
    }
    return mask.hover ? 'border-blue-400' : 'border-blue-700';
  }
}
