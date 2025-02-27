import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { HttpClientModule, HttpClient } from '@angular/common/http'; // Import HttpClientModule and HttpClient
import { localIP } from '../config'; // Import localIP from config
import { WebSocketService, UserInBattle } from '../services/websocket.service'; // Import WebSocketService and UserInBattle
import { ChatButtonComponent } from '../chat-button/chat-button.component'; // Import ChatButtonComponent
import { RollButtonComponent } from '../roll-button/roll-button.component'; // Import RollButtonComponent
import { jwtDecode } from 'jwt-decode'; // Import jwtDecode

@Component({
  selector: 'app-battle-map',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, ChatButtonComponent, RollButtonComponent], // Add CommonModule, FormsModule, HttpClientModule, ChatButtonComponent, and RollButtonComponent to imports
  templateUrl: './battle-map.component.html',
  styleUrls: ['./battle-map.component.css']
})
export class BattleMapComponent implements OnInit {
  role: string = 'Player'; // Add role property
  username: string | null = null; // Add username property
  usersInBattle: UserInBattle[] = []; // Update usersInBattle property type
  inBattle: boolean = false; // Add inBattle property
  showMaskSkillsModal: boolean = false; // Add property to control modal visibility
  maskActiveSkillDetails: any[] = []; // Add property to store mask active skill details
  maskID: number = 0; // Ensure maskID is always a number
  selectedSkill: any = null; // Add property to store the selected skill
  isSelectingTarget: boolean = false; // Add property to control target selection mode
  showChooseUserPopup: boolean = false; // Add property to control choose user popup visibility
  showSkillCanceledPopup: boolean = false; // Add property to control skill canceled popup visibility
  characterName: string = ''; // Add property to store the character name
  showMaskStatsPopup: boolean = false; // Add property to control mask stats popup visibility
  maskStatsPopupPosition: { top: number, left: number } = { top: 0, left: 0 }; // Add property to store popup position
  maskStats: any = {}; // Add property to store mask stats
  iconsOnMap: { characterName: string, maskPhoto: string, position: { top: number, left: number } }[] = []; // Update property to store icon positions
  triggerSkills: string[] = ['Nightmare', 'Test']; // Add array to store skill names Stage 5 uses this.
  currentTargetIndex: number = 0; // Add property to track current target index
  bubbleDelays: string[] = [];
  bubbleDurations: string[] = [];

  ngOnInit(): void {
    this.loadDataFromToken(); // Load data from token
    this.webSocketService.onUsersInBattleUpdate((users: UserInBattle[]) => {
      this.usersInBattle = users;
      this.sortUsersInBattle(); // Sort users by currentSpeed
      this.updateInBattleState();
    });
    this.webSocketService.requestUsersInBattle(); // Request initial list of users in battle

    // Log the currently signed-in user's characterName and fetch mask ID
    const token = localStorage.getItem('token'); // Get the JWT from localStorage
    if (token) {
      try {
        const decoded: any = jwtDecode(token); // Decode the JWT
        const characterID = decoded.characterID; // Extract the characterID

        // Fetch character info
        this.http.get(`https://${localIP}:8080/character-info/${characterID}`).subscribe((characterInfo: any) => {
          this.characterName = characterInfo.characterName;
          this.maskID = characterInfo.maskID || 0; // Ensure maskID is always a number
        });
      } catch (error) {
      }
    }

    // Fetch initial battle details
    this.webSocketService.requestUsersInBattle();

    this.webSocketService.onIconPlacement((data: { characterName: string, maskPhoto: string }) => {
      this.iconsOnMap.push({ ...data, position: { top: 0, left: 0 } }); // Add default position
    });

    this.webSocketService.onIconRemoval((data: { characterName: string }) => {
      this.iconsOnMap = this.iconsOnMap.filter(icon => icon.characterName !== data.characterName);
    });

    this.webSocketService.onIconDragging((data: { characterName: string, position: { top: number, left: number } }) => {
      const icon = this.iconsOnMap.find(icon => icon.characterName === data.characterName);
      if (icon) {
        icon.position = data.position;
      }
    });

    this.generateBubbleAnimations();
  }
  constructor(private route: ActivatedRoute, private http: HttpClient, private webSocketService: WebSocketService, private router: Router, private cdr: ChangeDetectorRef) {
  }
  defaultIcon: string = `https://${localIP}:8080/assets/images/Default.png`; // Add defaultIcon property
  mapUrl: string = `https://${localIP}:8080/assets/images/Map.jpg`;
  diceResult: string = ''; // Add diceResult property

  closeBattleMap() {
    this.router.navigate(['/']);
  }

  handleDiceResult(result: string) {
    this.diceResult = result; // Update the result when emitted
  }

  loadDataFromToken() {
    const token = localStorage.getItem('token'); // Get the JWT from localStorage
    if (token) {
      try {
        const decoded: any = jwtDecode(token); // Decode the JWT
        this.username = decoded.username; // Extract the username
        this.role = decoded.role; // Extract the role
      } catch (error) {
      }
    }
  }

  toggleBattleStatus() {
    const token = localStorage.getItem('token'); // Get the JWT from localStorage
    if (token) {
      try {
        const decoded: any = jwtDecode(token); // Decode the JWT
        const characterID = decoded.characterID; // Extract the characterID

        // Fetch character info
        this.http.get(`https://${localIP}:8080/character-info/${characterID}`).subscribe((characterInfo: any) => {
          const characterName = characterInfo.characterName;

          if (this.inBattle) {
            this.webSocketService.leaveBattle(characterName);
            this.webSocketService.emitIconRemoval(characterName);
          } else {
            this.webSocketService.joinBattle(characterName);

            // Fetch mask details
            if (this.maskID) {
              this.http.get(`https://${localIP}:8080/mask-details/${this.maskID}`).subscribe((maskDetails: any) => {
                const userInBattle: UserInBattle = {
                  characterName,
                  speed: maskDetails.speed,
                  health: maskDetails.health,
                  magicResist: maskDetails.magicResist,
                  protections: maskDetails.protections,
                  currentSpeed: 0,
                  currentHealth: maskDetails.health, 
                  action: false,
                  bonusAction: false,
                  movement: false,
                  stun: 0,
                  burn: 0,
                  poison: 0,
                  bleed: 0,
                  buffstack: 0,
                  cooldowns: {}, 
                  maskID: this.maskID,
                };

                // Add user to the list if not already present
                if (!this.usersInBattle.some(user => user.characterName === characterName)) {
                  this.usersInBattle.push(userInBattle);
                }

                this.sortUsersInBattle(); // Sort users by currentSpeed
                this.updateInBattleState();

                this.webSocketService.emitIconPlacement(characterName, `https://${localIP}:8080${maskDetails.photo}`);
              });
            } else {
              this.updateInBattleState();
            }
          }
        });
      } catch (error) {
      }
    }
  }

  sortUsersInBattle() {
    this.usersInBattle.sort((a, b) => {
      if (a.currentHealth <= 0 && b.currentHealth > 0) {
        return 1; // Move dead users to the bottom
      } else if (a.currentHealth > 0 && b.currentHealth <= 0) {
        return -1; // Keep alive users at the top
      } else {
        return b.currentSpeed - a.currentSpeed; // Sort by currentSpeed
      }
    });
  }

  updateInBattleState() {
    const token = localStorage.getItem('token'); // Get the JWT from localStorage
    if (token) {
      try {
        const decoded: any = jwtDecode(token); // Decode the JWT
        const characterID = decoded.characterID; // Extract the characterID

        // Fetch character info
        this.http.get(`https://${localIP}:8080/character-info/${characterID}`).subscribe((characterInfo: any) => {
          const characterName = characterInfo.characterName;
          this.inBattle = this.usersInBattle.some(user => user.characterName === characterName);
        });
      } catch (error) {
      }
    }
  }

  continueBattle() {
    // Stage 1: Set Action, Bonus Action and Movement to false
    this.usersInBattle.forEach(user => {
      user.action = false;
      user.bonusAction = false;
      user.movement = false;
    });

    // Stage 2: Handle all on-hit effects.
    this.usersInBattle.forEach(user => {

      // Handle Burn
      if (user.burn > 0) {
        const burnDamage = user.currentHealth * 0.1;
        user.currentHealth -= burnDamage;
        user.burn = Math.max(user.burn - 1, 0);
      }

      // Handle Poison
      if (user.poison > 0) {
        const poisonDamage = user.health * (user.poison / 100);
        user.currentHealth -= poisonDamage;
        user.poison += 1;
      }

      // Handle Bleed
      if (user.bleed > 0) {
        const bleedDamage = user.health * 0.05;
        user.currentHealth -= bleedDamage;
        user.bleed = Math.max(user.bleed - 1, 0);
      }
    });

    // Stage 3: Update currentSpeed for each user
    this.usersInBattle.forEach(user => {
      if (user.stun === 0 && user.currentHealth > 0) {        
        if (user.currentSpeed >= 100) {
          user.currentSpeed = 0; // Decrease currentSpeed by 100
        }
        user.currentSpeed += user.speed; // Increase currentSpeed by speed value
        if (user.currentSpeed >= 100) {
          user.currentSpeed = 100; // Cap currentSpeed at 100
        }
      } else {
        user.stun = Math.max(user.stun - 1, 0); // Decrease stun by 1
      }
    });
    this.sortUsersInBattle(); // Sort users by updated currentSpeed

    // Stage 4: Set Action, Bonus Action and Movement to true if currentSpeed is 100 and user is not stunned
    this.usersInBattle.forEach(user => {
      if (user.currentSpeed === 100 && user.stun === 0) {
        user.action = true;
        user.bonusAction = true;
        user.movement = true;

        // Stage 5: Emit trigger skills event
        this.usersInBattle.forEach(user => {
          this.triggerSkills.forEach(skill => {
            if (user.skillList && user.skillList.includes(skill)) {
              if (skill === 'Nightmare') {
                this.usersInBattle.forEach(targetUser => {
                  if (targetUser.characterName !== user.characterName) {
                    const roll = Math.floor(Math.random() * 20) + 1;
                    console.log(`User ${targetUser.characterName} rolled ${roll}`);
                    if (roll === 1) {
                      targetUser.currentHealth = 0;
                    } else if (roll < user.buffstack) {
                      targetUser.stun += 3;
                    }
                  }
                });
              } else if (skill === 'Test') {
                console.log('Test skill is present');
              } else {
                console.log(`${skill} is present`);
              }
            }
          });
        });

        // Decrement cooldowns for skills
        if (user.cooldowns) {
          Object.keys(user.cooldowns).forEach(skillID => {
            const skillIDNumber = Number(skillID);
            if (user.cooldowns && user.cooldowns[skillIDNumber] > 0) {
              user.cooldowns[skillIDNumber] -= 1;
            }
          });
        }
      }
    });
    this.webSocketService.emitUsersInBattleUpdate(this.usersInBattle);
  }

  openMaskSkillsModal() {
    const user = this.usersInBattle.find(user => user.characterName === this.characterName);
    if (user && user.action && user.stun === 0 && user.currentHealth > 0) {
      this.http.get(`https://${localIP}:8080/mask-details/${this.maskID}`).subscribe((maskDetails: any) => {
        this.maskActiveSkillDetails = maskDetails.activeSkills.map((skillID: number) => {
          return this.http.get(`https://${localIP}:8080/mask-skill-details/${skillID}`).toPromise();
        });
        Promise.all(this.maskActiveSkillDetails).then((skills: any[]) => {
          this.maskActiveSkillDetails = skills;
          this.showMaskSkillsModal = true;

          // Initialize cooldowns for all skills if not already present
          if (!user.cooldowns) {
            user.cooldowns = {};
          }
          this.maskActiveSkillDetails.forEach(skill => {
            if (!user.cooldowns) {
              user.cooldowns = {};
            }
            if (user.cooldowns[skill.skillID] === undefined) {
              user.cooldowns[skill.skillID] = 0;
            }
          });

          // Save skillList locally for the user
          user.skillList = skills.map((skill: any) => skill.skillName);
        }).catch(error => {
          // Handle error
        });
        user.action = false;
      }, error => {
        // Handle error
      });
    }
  }

  closeMaskSkillsModal() {
    this.showMaskSkillsModal = false;
    this.showSkillCanceledPopup = true;
    setTimeout(() => {
      this.showSkillCanceledPopup = false;
    }, 2000); // Show the popup for 2 seconds

    // Refund the action if the skill is canceled
    const user = this.usersInBattle.find(user => user.characterName === this.characterName);
    if (user) {
      user.action = true;
    }
  }

  logSkillId(skillID: number) {
    const user = this.usersInBattle.find(user => user.characterName === this.characterName);
    if (user && user.cooldowns) {
      const cooldown = user.cooldowns[skillID] || 0;
    }
    if (user && user.cooldowns && user.cooldowns[skillID] === 0) {
      this.http.get(`https://${localIP}:8080/mask-skill-details/${skillID}`).subscribe((skillDetails: any) => {
        const mainStat = skillDetails.mainStat;
        const mainStatPercentage = skillDetails.mainStatPercentage;
        const amountOfStrikes = skillDetails.amountOfStrikes;
        const onHitEffect = skillDetails.onHitEffect;
        const cooldown = skillDetails.cooldown + 1;
        const isMultiTarget = skillDetails.isMultiTarget; // Add isMultiTarget property

        if (this.maskID) {
          this.http.get(`https://${localIP}:8080/mask-details/${this.maskID}`).subscribe((maskDetails: any) => {
            let mainStatValue;
            if (mainStat.toLowerCase() === 'ability damage') {
              mainStatValue = maskDetails.abilityDamage;
            } else if (mainStat.toLowerCase() === 'attack damage') {
              mainStatValue = maskDetails.attackDamage;
            } else {
              mainStatValue = maskDetails[mainStat.toLowerCase()];
            }
            const damage = mainStatValue * (mainStatPercentage / 100);

            this.selectedSkill = {
              skillID,
              mainStat, // Store mainStat
              damage,
              amountOfStrikes,
              onHitEffect,
              cooldown,
              isMultiTarget // Add isMultiTarget property
            };
            this.showMaskSkillsModal = false;
            this.isSelectingTarget = true;
            this.showChooseUserPopup = true;
            this.currentTargetIndex = 0; // Reset target index
          });
        }
      });
    } else {
    }
  }

  selectTarget(user: UserInBattle) {
    if (this.isSelectingTarget && this.selectedSkill) {
      let totalDamage = 0;
      // Apply Magic Resist and Protection
      if (this.selectedSkill.mainStat && this.selectedSkill.mainStat.toLowerCase() === 'ability damage') {
        this.selectedSkill.damage -= user.magicResist;
      } else if (this.selectedSkill.mainStat && this.selectedSkill.mainStat.toLowerCase() === 'attack damage') {
        this.selectedSkill.damage -= user.protections;
      }

      totalDamage = this.selectedSkill.damage;

      // Ensure damage does not go below zero
      totalDamage = Math.max(totalDamage, 0);

      user.currentHealth -= totalDamage;

      // Apply on-hit effects
      if (this.selectedSkill.onHitEffect === 'Stun') {
        user.stun += 1;
      } else if (this.selectedSkill.onHitEffect === 'Burn') {
        user.burn += 1;
      } else if (this.selectedSkill.onHitEffect === 'Poison') {
        user.poison += 1;
      } else if (this.selectedSkill.onHitEffect === 'Bleed') {
        user.bleed += 1;
      }

      // Apply Buff Stack to the user instead of the target
      if (this.selectedSkill.onHitEffect === 'Buff Stack') {
        const currentUser = this.usersInBattle.find(u => u.characterName === this.characterName);
        if (currentUser) {
          currentUser.buffstack += 1;
        }
      }

      this.currentTargetIndex += 1; // Increment target index

      if (this.currentTargetIndex >= this.selectedSkill.amountOfStrikes || !this.selectedSkill.isMultiTarget) {
        if (!this.selectedSkill.isMultiTarget) {
          // Apply remaining strikes to the same target
          for (let i = this.currentTargetIndex; i < this.selectedSkill.amountOfStrikes; i++) {
            user.currentHealth -= totalDamage;
            if (this.selectedSkill.onHitEffect === 'Stun') {
              user.stun += 1;
            } else if (this.selectedSkill.onHitEffect === 'Burn') {
              user.burn += 1;
            } else if (this.selectedSkill.onHitEffect === 'Poison') {
              user.poison += 1;
            } else if (this.selectedSkill.onHitEffect === 'Bleed') {
              user.bleed += 1;
            }
          }
        }

        // Set cooldown for the used skill
        const currentUser = this.usersInBattle.find(u => u.characterName === this.characterName);
        if (currentUser) {
          if (!currentUser.cooldowns) {
            currentUser.cooldowns = {};
          }
          currentUser.cooldowns[this.selectedSkill.skillID] = this.selectedSkill.cooldown;
        }

        this.isSelectingTarget = false;
        this.selectedSkill = null;
        this.showChooseUserPopup = false;

        // Set action to false after dealing damage
        const token = localStorage.getItem('token'); // Get the JWT from localStorage
        if (token) {
          try {
            const decoded: any = jwtDecode(token); // Decode the JWT
            const characterID = decoded.characterID; // Extract the characterID

            const currentUser = this.usersInBattle.find(user => user.characterName === decoded.username);
            if (currentUser) {
              currentUser.action = false;
            }
          } catch (error) {
          }
        }

        // Emit the updated usersInBattle to the server
        this.webSocketService.emitUsersInBattleUpdate(this.usersInBattle);
      }
    }
  }

  getSkillBorderClass(skillID: number): string {
    const user = this.usersInBattle.find(user => user.characterName === this.characterName);
    if (user && user.cooldowns) {
      return user.cooldowns[skillID] === 0 ? 'border-blue-500' : 'border-red-500';
    }
    return 'border-blue-500';
  }

  getUserBorderClass(user: UserInBattle): string {
    return user.currentHealth > 0 ? 'border-blue-500' : 'border-red-500';
  }

  getUserClasses(user: UserInBattle): string {
    const baseClasses = 'border p-4 rounded mb-4';
    const borderClass = this.getUserBorderClass(user);
    const cursorClass = this.isSelectingTarget ? 'cursor-pointer' : '';
    const hoverClass = this.showChooseUserPopup ? 'hover:bg-blue-500 hover:text-stone-950' : '';
    return `${baseClasses} ${borderClass} ${cursorClass} ${hoverClass}`;
  }

  cancelSkill() {
    this.isSelectingTarget = false;
    this.selectedSkill = null;
    this.showChooseUserPopup = false;
    this.showSkillCanceledPopup = true;
    setTimeout(() => {
      this.showSkillCanceledPopup = false;
    }, 2000); // Show the popup for 2 seconds
  
    // Refund the action if the skill is canceled
    const user = this.usersInBattle.find(user => user.characterName === this.characterName);
    if (user) {
      user.action = true;
    }
  }

  endBattle() {
    this.usersInBattle.forEach(user => {
      this.webSocketService.leaveBattle(user.characterName);
    });
    this.usersInBattle = [];
    this.inBattle = false;
    this.webSocketService.emitUsersInBattleUpdate(this.usersInBattle);
  }

  showMaskStats(user: UserInBattle, event: MouseEvent) {
    this.http.get(`https://${localIP}:8080/mask-details/${user.maskID}`).subscribe((maskDetails: any) => {
      this.maskStats = {
        attackDamage: maskDetails.attackDamage,
        abilityDamage: maskDetails.abilityDamage,
        magicResist: maskDetails.magicResist,
        protections: maskDetails.protections,
        health: maskDetails.health,
        speed: maskDetails.speed,
        photo: `https://${localIP}:8080${maskDetails.photo}` // Include mask photo
      };
      this.showMaskStatsPopup = true;

      const popupHeight = 300; // Approximate height of the popup
      const screenHeight = window.innerHeight;
      const topPosition = event.clientY + popupHeight > screenHeight ? event.clientY - popupHeight : event.clientY;

      this.maskStatsPopupPosition = { top: topPosition, left: event.clientX };
    });
  }

  hideMaskStats() {
    this.showMaskStatsPopup = false;
  }

  startDrag(event: DragEvent, characterName: string) {
    event.dataTransfer?.setData('text/plain', characterName);
    event.dataTransfer?.setDragImage(new Image(), 0, 0); // Hide the default drag image
  }

  dragOver(event: DragEvent) {
    event.preventDefault(); // Allow the drop
  }

  drag(event: DragEvent, characterName: string) {
    const icon = this.iconsOnMap.find(icon => icon.characterName === characterName);
    if (icon) {
      const container = document.querySelector('.col-span-2') as HTMLElement; // Ensure the correct container is selected
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const newPosition = {
          top: Math.max(0, Math.min(event.clientY - containerRect.top, containerRect.height - (event.target as HTMLElement).offsetHeight)),
          left: Math.max(0, Math.min(event.clientX - containerRect.left, containerRect.width - (event.target as HTMLElement).offsetWidth))
        };
        icon.position = newPosition;
        this.webSocketService.emitIconDragging(characterName, newPosition);
      }
    }
  }

  endDrag(event: DragEvent, characterName: string) {
    // No need to handle anything here for now
  }

  shouldApplyGooEffect(): boolean {
    return this.usersInBattle.some(user => user.characterName === this.characterName && user.action && user.stun === 0 && user.currentHealth > 0);
  }

  generateBubbleAnimations() {
    for (let i = 0; i < 10; i++) {
      this.bubbleDelays[i] = this.generateRandomDelay();
      this.bubbleDurations[i] = this.generateRandomDuration();
    }
    this.cdr.detectChanges(); // Manually trigger change detection
  }

  generateRandomDelay(): string {
    return `${Math.random() * 2}s`; // Generate a random delay between 0 and 2 seconds
  }

  generateRandomDuration(): string {
    return `${Math.random() * 3 + 2}s`; // Generate a random duration between 2 and 5 seconds
  }
}
