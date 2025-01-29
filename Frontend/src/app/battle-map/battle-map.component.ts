import { Component, OnInit } from '@angular/core';
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
  }
  router: Router; // Add router property
  constructor(private route: ActivatedRoute, private http: HttpClient, private webSocketService: WebSocketService, router: Router) {
    this.router = router; // Initialize router
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
          } else {
            this.webSocketService.joinBattle(characterName);

            // Fetch mask details
            if (this.maskID) {
              this.http.get(`https://${localIP}:8080/mask-details/${this.maskID}`).subscribe((maskDetails: any) => {
                const userInBattle: UserInBattle = {
                  characterName,
                  speed: maskDetails.speed,
                  health: maskDetails.health,
                  magicResist: maskDetails.magicResist, // Initialize magicResist
                  protections: maskDetails.protections, // Initialize protections
                  currentSpeed: 0, // Initialize currentSpeed to the value from the table
                  currentHealth: maskDetails.health, // Initialize currentHealth to health
                  action: false,
                  bonusAction: false,
                  movement: false,
                  stun: 0, // Initialize stun to 0
                  burn: 0, // Initialize burn to 0
                  poison: 0, // Initialize poison to 0
                  bleed: 0, // Initialize bleed to 0
                  buffstack: 0, // Initialize buffstack to 0
                  cooldowns: {}, // Initialize cooldowns to an empty object
                  maskID: this.maskID // Include maskID
                };

                // Add user to the list if not already present
                if (!this.usersInBattle.some(user => user.characterName === characterName)) {
                  this.usersInBattle.push(userInBattle);
                }

                this.sortUsersInBattle(); // Sort users by currentSpeed
                this.updateInBattleState();
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
    this.usersInBattle.sort((a, b) => b.currentSpeed - a.currentSpeed);
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
      if (user.stun === 0) {        
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

    // Emit the updated usersInBattle to the server
    console.log(this.usersInBattle);
    this.webSocketService.emitUsersInBattleUpdate(this.usersInBattle);
  }

  openMaskSkillsModal() {
    const user = this.usersInBattle.find(user => user.characterName === this.characterName);
    if (user && user.action && user.stun === 0) {
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
              cooldown
            };
            this.showMaskSkillsModal = false;
            this.isSelectingTarget = true;
            this.showChooseUserPopup = true;
          });
        }
      });
    } else {
    }
    
  }

  selectTarget(user: UserInBattle) {
    if (this.isSelectingTarget && this.selectedSkill) {
      
      console.log(`Magic Resist: ${user.magicResist}`);
      console.log(`Protections: ${user.protections}`);
      let totalDamage = 0

      console.log(this.selectedSkill);
      // Apply Magic Resist and Protection
      if (this.selectedSkill.mainStat && this.selectedSkill.mainStat.toLowerCase() === 'ability damage') {
        this.selectedSkill.damage -= user.magicResist;
        console.log(`Damage after Magic Resist: ${this.selectedSkill.damage}`);
      } else if (this.selectedSkill.mainStat && this.selectedSkill.mainStat.toLowerCase() === 'attack damage') {
        this.selectedSkill.damage -= user.protections;
        console.log(`Damage after Protection: ${this.selectedSkill.damage}`);
      }

      totalDamage =  this.selectedSkill.damage * this.selectedSkill.amountOfStrikes;
      

      // Ensure damage does not go below zero
      totalDamage = Math.max(totalDamage, 0);
      console.log(`Total Damage: ${totalDamage}`);
      
      user.currentHealth -= totalDamage;

      // Apply on-hit effects
      if (this.selectedSkill.onHitEffect === 'Stun') {
        user.stun += this.selectedSkill.amountOfStrikes;
      } else if (this.selectedSkill.onHitEffect === 'Burn') {
        user.burn += this.selectedSkill.amountOfStrikes;
      } else if (this.selectedSkill.onHitEffect === 'Poison') {
        user.poison += this.selectedSkill.amountOfStrikes;
      } else if (this.selectedSkill.onHitEffect === 'Bleed') {
        user.bleed += this.selectedSkill.amountOfStrikes;
      } else if (this.selectedSkill.onHitEffect === 'Buffstack') {
        user.buffstack += this.selectedSkill.amountOfStrikes;
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

  getSkillBorderClass(skillID: number): string {
    const user = this.usersInBattle.find(user => user.characterName === this.characterName);
    if (user && user.cooldowns) {
      return user.cooldowns[skillID] === 0 ? 'border-blue-500' : 'border-red-500';
    }
    return 'border-blue-500';
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
}
