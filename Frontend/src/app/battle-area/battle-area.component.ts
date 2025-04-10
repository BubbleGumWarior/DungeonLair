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
  showAssignTeamsModal: boolean = false; // Add showAssignTeamsModal flag
  allies: any[] = []; // Add allies array
  neutral: any[] = []; // Add neutral array
  enemies: any[] = []; // Add enemies array
  showConfirmationModal: boolean = false; // Add showConfirmationModal flag
  showHealConfirmationModal: boolean = false; // Add showHealConfirmationModal flag
  confirmationTarget: any = null; // Add confirmationTarget variable
  battleMessages: string[] = []; // Change battleMessage to an array
  selectedMaskDetails: any = null; // Add selectedMaskDetails variable
  showMaskDetailsModal: boolean = false; // Add showMaskDetailsModal flag

  constructor(private http: HttpClient, private webSocketService: WebSocketService, private router: Router) { // Add Router to constructor
    this.webSocketService.onMasksInBattleUpdate((masks) => {
      this.masksInBattle = masks.sort((a, b) => b.speed - a.speed);
      this.updateMaskPhotos(); // Ensure photos are updated
    });
    this.webSocketService.onBattleMessage((message) => {
      this.battleMessages.push(message);
      setTimeout(() => {
        this.battleMessages.shift();
      }, 10000); // Remove message after 3 seconds
    });
  }

  ngOnInit() {
    this.loadUserInformationFromToken();
    document.addEventListener('click', this.closeModalOnClickOutside.bind(this)); // Add event listener
    this.neutral = [...this.masksInBattle]; // Initialize neutral array with masksInBattle
    document.addEventListener('click', this.closeAssignTeamsModalOnClickOutside.bind(this)); // Add event listener for assign teams modal

    // Fetch the current state of masksInBattle from the server
    this.http.get(`https://${localIP}:8080/masks-in-battle`)
      .subscribe(
        (masks: any) => { // Change type to any
          this.masksInBattle = masks.sort((a: any, b: any) => b.currentSpeed - a.currentSpeed); // Explicitly type parameters
          this.updateMaskPhotos(); // Ensure photos are updated
        },
        (error) => {
          console.error('Error fetching masks in battle:', error);
        }
      );
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.closeModalOnClickOutside.bind(this)); // Remove event listener
    document.removeEventListener('click', this.closeAssignTeamsModalOnClickOutside.bind(this)); // Remove event listener for assign teams modal
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
            currentSpeed: data.speed,
            photo: data.photo.startsWith('http') ? data.photo : `https://${localIP}:8080${data.photo}` // Ensure correct photo URL
          };
          console.log('Mask info:', this.maskInformation);
        },
        (error) => {
          console.error('Error fetching mask info:', error);
        }
      );
  }

  joinBattle() {
    if (this.userInformation.maskID) {
      this.webSocketService.joinBattle(this.userInformation.maskID);
      this.updateMaskPhotos(); // Ensure photos are updated
    }
  }

  useMainAction() {
    if (!this.canUseMainAction() || this.isUserStunned()) {
      return; // Do nothing if the main action cannot be used or user is stunned
    }

    const userMask = this.masksInBattle.find(mask => mask.maskID === this.userInformation.maskID);
    if (userMask && userMask.activeSkills) {
      const skillIDs = userMask.activeSkills.join(',');
      this.http.get(`https://${localIP}:8080/mask-skills?skillIDs=${skillIDs}`)
        .subscribe(
          (skills: any) => {
            this.skills = skills;
            this.showSkillsModal = true; // Show the modal
            this.checkSkillCooldowns();
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
    if (skill.cooldown > 0 || this.isUserStunned()) {
      return; // Do nothing if the skill is on cooldown or user is stunned
    }
    if (this.masksInBattle.find(mask => mask.maskID === this.userInformation.maskID).stunStacks > 0) {
      return; // Do nothing if the user mask is stunned
    }
    this.selectedSkill = skill;
    console.log('Selected skill:', this.selectedSkill);
    this.selectedTargets = []; // Reset selectedTargets
    this.showSkillsModal = false; // Close the modal
    this.showTargetBanner = true; // Show banner
  }

  selectTarget(mask: any) {
    if (this.selectedSkill && mask.stunStacks < 1 && !this.isUserStunned()) {
      const userMask = this.masksInBattle.find(m => m.maskID === this.userInformation.maskID);
      if (mask.untargetable || mask.currentHealth === 0) {
        return; // Do nothing if the mask is untargetable or dead
      }
      else if (userMask && userMask.team === mask.team && this.selectedSkill.onHitEffect !== 'Heal') {
        this.showConfirmationModal = true;
        this.confirmationTarget = mask;
      } 
      else if (userMask && userMask.team !== mask.team && this.selectedSkill.onHitEffect === 'Heal') {
        this.showHealConfirmationModal = true;
        this.confirmationTarget = mask;
      } 
      else {
        this.processTargetSelection(mask);
      }
    }
  }

  processTargetSelection(mask: any) {
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

  confirmTargetSelection() {
    if (this.confirmationTarget) {
      this.processTargetSelection(this.confirmationTarget);
      this.showConfirmationModal = false;
      this.showHealConfirmationModal = false;
      this.confirmationTarget = null;
    }
  }

  cancelTargetSelection() {
    this.showConfirmationModal = false;
    this.showHealConfirmationModal = false;
    this.confirmationTarget = null;
  }

  sendSkillAction() {
    console.log('Sending skill action:', this.selectedSkill.skillID, this.selectedTargets);
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

  closeAssignTeamsModalOnClickOutside(event: MouseEvent) {
    const modal = document.querySelector('.assign-teams-modal');
    if (this.showAssignTeamsModal && modal && !modal.contains(event.target as Node)) {
      this.closeAssignTeamsModal();
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
    if (mask.untargetable) {
      return 'border-gray-700'; // Return gray border if untargetable
    }
    return mask.hover ? 'border-blue-400' : 'border-blue-700';
  }

  openAssignTeamsModal() {
    this.showAssignTeamsModal = true;
    this.updateColumns(); // Update columns when the modal is opened
  }

  closeAssignTeamsModal() {
    this.showAssignTeamsModal = false;
    this.pushTeamChangesToServer();
  }

  pushTeamChangesToServer() {
    const teamChanges = this.masksInBattle.map(mask => ({
      maskID: mask.maskID,
      team: mask.team
    }));
    this.webSocketService.updateTeams(teamChanges);
  }

  moveMask(mask: any, team: string) {
    mask.team = team;
    this.updateColumns();
  }

  moveLeft(mask: any) {
    if (mask.team === 'Enemy') {
      this.moveMask(mask, 'Neutral');
    } else if (mask.team === 'Neutral') {
      this.moveMask(mask, 'Ally');
    }
  }

  moveRight(mask: any) {
    if (mask.team === 'Ally') {
      this.moveMask(mask, 'Neutral');
    } else if (mask.team === 'Neutral') {
      this.moveMask(mask, 'Enemy');
    }
  }

  updateColumns() {
    this.allies = this.getMasksByTeam('Ally');
    this.neutral = this.getMasksByTeam('Neutral');
    this.enemies = this.getMasksByTeam('Enemy');
  }

  getMasksByTeam(team: string) {
    return this.masksInBattle.filter(mask => mask.team === team);
  }
  
  checkSkillCooldowns() {
    if (this.userInformation && this.userInformation.maskID) {
      const mask = this.masksInBattle.find(mask => mask.maskID === this.userInformation.maskID);
      if (mask && mask.cooldowns) {
        this.skills.forEach(skill => {
          skill.cooldown = mask.cooldowns[skill.skillID] || 0;
        });
      }
    }
  }

  endBattle() {
          this.http.post(`https://${localIP}:8080/end-battle`, {}).subscribe(
        () => console.log('End battle request sent successfully'),
        (error) => console.error('Error sending end battle request:', error)
      );
      }

  openMaskDetails(mask: any) {
    this.selectedMaskDetails = mask;
    this.showMaskDetailsModal = true;
  }

  closeMaskDetailsModal() {
    this.showMaskDetailsModal = false;
    this.selectedMaskDetails = null;
  }

  isUserStunned(): boolean {
    const userMask = this.masksInBattle.find(mask => mask.maskID === this.userInformation.maskID);
    return userMask ? userMask.stunStacks > 0 : false;
  }

  updateMaskPhotos() {
    this.masksInBattle.forEach(mask => {
      mask.photo = mask.photo.startsWith('http') ? mask.photo : `https://${localIP}:8080${mask.photo}`; // Ensure correct photo URL
    });
  }
}
