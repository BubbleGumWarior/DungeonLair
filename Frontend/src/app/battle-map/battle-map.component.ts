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
  maskID: number | null = null; // Add property to store mask ID
  selectedSkill: any = null; // Add property to store the selected skill
  isSelectingTarget: boolean = false; // Add property to control target selection mode
  showChooseUserPopup: boolean = false; // Add property to control choose user popup visibility
  showSkillCanceledPopup: boolean = false; // Add property to control skill canceled popup visibility
  characterName: string = ''; // Add property to store the character name

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
          this.maskID = characterInfo.maskID; // Store the mask ID
          console.log(`Currently signed-in user's characterName: ${this.characterName}`);
        });
      } catch (error) {
        console.error('Error decoding token:', error);
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
                  currentSpeed: 0, // Initialize currentSpeed to the value from the table
                  currentHealth: maskDetails.health, // Initialize currentHealth to health
                  action: false,
                  bonusAction: false,
                  movement: false
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

    // Stage 2: Update currentSpeed for each user
    this.usersInBattle.forEach(user => {
      if (user.currentSpeed >= 100) {
        user.currentSpeed = 0; // Decrease currentSpeed by 100
      }
      user.currentSpeed += user.speed; // Increase currentSpeed by speed value
      if (user.currentSpeed >= 100) {
        user.currentSpeed = 100; // Cap currentSpeed at 100
      }
    });
    this.sortUsersInBattle(); // Sort users by updated currentSpeed

    // Stage 3: Set Action, Bonus Action and Movement to true if currentSpeed is 100
    this.usersInBattle.forEach(user => {
      if (user.currentSpeed === 100) {
        user.action = true;
        user.bonusAction = true;
        user.movement = true;
        console.log(`${user.characterName} is ready to take action!`);
      }
    });

    // Emit the updated usersInBattle to the server
    console.log(this.usersInBattle);
    this.webSocketService.emitUsersInBattleUpdate(this.usersInBattle);
  }

  openMaskSkillsModal() {
    const user = this.usersInBattle.find(user => user.characterName === this.characterName);
    console.log(user);
    if (user && user.action) {
      console.log("Getting mask details");
      this.http.get(`https://${localIP}:8080/mask-details/${this.maskID}`).subscribe((maskDetails: any) => {
        this.maskActiveSkillDetails = maskDetails.activeSkills.map((skillID: number) => {
          return this.http.get(`https://${localIP}:8080/mask-skill-details/${skillID}`).toPromise();
        });
        Promise.all(this.maskActiveSkillDetails).then((skills: any[]) => {
          this.maskActiveSkillDetails = skills;
          this.showMaskSkillsModal = true;
        }).catch(error => {
        });
      }, error => {
      });
    }
  }

  closeMaskSkillsModal() {
    this.showMaskSkillsModal = false;
  }

  logSkillId(skillID: number) {
    this.http.get(`https://${localIP}:8080/mask-skill-details/${skillID}`).subscribe((skillDetails: any) => {
      const mainStat = skillDetails.mainStat;
      console.log(`Main Stat: ${mainStat}`);
      const mainStatPercentage = skillDetails.mainStatPercentage;
      console.log(`Main Stat Percentage: ${mainStatPercentage}`);
      const amountOfStrikes = skillDetails.amountOfStrikes;
      console.log(`Amount of Strikes: ${amountOfStrikes}`);
      const onHitEffect = skillDetails.onHitEffect;
      console.log(`On Hit Effect: ${onHitEffect}`);

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
          console.log(`Main Stat Value: ${mainStatValue}`);
          const damage = mainStatValue * (mainStatPercentage / 100);
          console.log(`Damage: ${damage}`);

          this.selectedSkill = {
            damage,
            amountOfStrikes,
            onHitEffect
          };
          this.showMaskSkillsModal = false;
          this.isSelectingTarget = true;
          this.showChooseUserPopup = true;
        });
      }
    });
  }

  selectTarget(user: UserInBattle) {
    if (this.isSelectingTarget && this.selectedSkill) {
      const totalDamage = this.selectedSkill.damage * this.selectedSkill.amountOfStrikes;
      user.currentHealth -= totalDamage;
      console.log(`User: ${user.characterName}, Health reduced by: ${totalDamage}, New Health: ${user.currentHealth}`);
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

      this.webSocketService.emitUsersInBattleUpdate(this.usersInBattle);
    }
  }
}
