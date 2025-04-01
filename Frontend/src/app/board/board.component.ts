import { Component, Input, EventEmitter, Output, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { localIP } from '../config'; // Import the IP address
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [ CommonModule ],
  templateUrl: './board.component.html',
  styleUrl: './board.component.css'
})
export class BoardComponent implements OnInit {
  @Input() characterID: string | null = '';
  @Output() resultRolled = new EventEmitter<string>();

  showPopup: boolean = false;
  rollResult: number = 0;
  
  strength: number = 0;
  strengthMod: string = "";
  athletics: number = 0;

  dexterity: number = 0;
  dexterityMod: string = "";
  acrobatics: number = 0;
  sleightOfHand: number = 0;
  stealth: number = 0;

  constitution: number = 0;
  constitutionMod: string = "";

  intelligence: number = 0;
  intelligenceMod: string = "";
  history: number = 0;
  investigation: number = 0;
  nature: number = 0;

  wisdom: number = 0;
  wisdomMod: string = "";
  animalHandling: number = 0;
  insight: number = 0;
  medicine: number = 0;
  perception: number = 0;
  survival: number = 0;

  charisma: number = 0;
  charismaMod: string = "";
  deception: number = 0;
  intimidation: number = 0;
  performance: number = 0;
  persuasion: number = 0;
  createdAt: Date = new Date();
  updatedAt: Date = new Date();

  class: string = "";
  race: string = "";
  photo: string = "";
  level: number = 0;

  statsSheet: any;
  characterName: string = '';
  isMobile: boolean = false;
  maskPhoto: string = '';
  showMask: boolean = false;
  maskStats: any = {};
  maskSkills: any = {};
  maskActiveSkillDetails: any[] = [];
  maskMods: any[] = []; // Add this variable to store mods for the mask
  hoveredMod: any = null; // Add this variable to track the hovered mod

  constructor(private http: HttpClient, private sanitizer: DomSanitizer, private cdr: ChangeDetectorRef, private ngZone: NgZone) {}

  ngOnInit() {
    this.isMobile = this.detectMobileDevice();
    if (this.characterID) {
      this.fetchStatsSheet(this.characterID);
      this.fetchCharacterInfo(this.characterID);
    } else {
      console.log('No character name provided');
    }
  }

  detectMobileDevice(): boolean {
    return window.innerWidth <= 768; // Adjust the width as needed for mobile detection
  }

  fetchStatsSheet(characterName: string) {
    console.log('Fetching stats sheet for character:', characterName);
    this.http.get(`https://${localIP}:8080/stats-sheet/${characterName}`)
      .subscribe(
        (data: any) => {
          console.log('Stats sheet data:', data);
          this.statsSheet = data;
          this.updateStats(data);  // Update stats with the fetched data
        },
        (error) => {
          console.error('Error fetching stats sheet:', error);
        }
      );
  }

  async fetchCharacterInfo(characterName: string) {
    console.log('Fetching character info for character:', characterName);
    try {
      const response = await fetch(`https://${localIP}:8080/character-info/${characterName}`);
      if (!response.ok) throw new Error('Failed to fetch info');
      
      const characterInfo = await response.json();
      console.log('Character info data:', characterInfo);
      this.characterName = characterInfo.characterName; // Set the characterName
      this.updateCharacterInfo(characterInfo);  // Update stats with the fetched data
      if (characterInfo.maskID) {
        this.fetchMaskDetails(characterInfo.maskID);
      }
    } catch (error) {
      console.error('Error fetching character info:', error);
    }
  }

  fetchMaskDetails(maskID: number) {
    this.http.get(`https://${localIP}:8080/mask-details/${maskID}`)
      .subscribe(
        (data: any) => {
          console.log('Mask details received from server:', data); // Log the mask object
          this.maskPhoto = `https://${localIP}:8080${data.photo}`;
          this.maskStats = {
            attackDamage: data.attackDamage,
            abilityDamage: data.abilityDamage,
            magicResist: data.magicResist,
            protections: data.protections,
            health: data.health,
            speed: data.speed
          };
          this.maskSkills = {
            passiveSkill: data.passiveSkill,
            activeSkills: data.activeSkills
          };
          console.log("Fetching")
          this.fetchActiveSkillDetails(data.activeSkills);
          this.fetchModsForMask(maskID); // Fetch mods for the mask
        },
        (error) => {
          console.error('Error fetching mask details:', error);
        }
      );
  }

  fetchModsForMask(maskID: number) {
    this.http.get<any[]>(`https://${localIP}:8080/masks/${maskID}/mods`).subscribe(
      (data) => {
        this.maskMods = data;
      },
      (error) => {
        console.error('Error fetching mods for mask:', error);
      }
    );
  }

  fetchActiveSkillDetails(skillIDs: number[]) {
    this.maskActiveSkillDetails = [];
    skillIDs.forEach(skillID => {
      this.http.get(`https://${localIP}:8080/mask-skill-details/${skillID}`)
        .subscribe(
          (data: any) => {
            this.ngZone.run(() => {
              if (Array.isArray(data)) {
                data.forEach(skill => {
                  this.maskActiveSkillDetails.push(skill);
                });
              } else {
                this.maskActiveSkillDetails.push(data);
              }
              this.cdr.detectChanges(); // Trigger change detection
            });
          },
          (error) => {
            console.error(`Error fetching skill details for skill ID ${skillID}:`, error);
          }
        );
    });
  }

  toggleMask() {
    this.showMask = !this.showMask;
  }

  updateStats(stats: any) {
    this.strength = Number(stats.strength);
    this.athletics = Number(stats.athletics);
    this.dexterity = Number(stats.dexterity);
    this.acrobatics = Number(stats.acrobatics);
    this.sleightOfHand = Number(stats.sleightOfHand);
    this.stealth = Number(stats.stealth);
    this.constitution = Number(stats.constitution);
    this.intelligence = Number(stats.intelligence);
    this.history = Number(stats.history);
    this.investigation = Number(stats.investigation);
    this.nature = Number(stats.nature);
    this.wisdom = Number(stats.wisdom);
    this.animalHandling = Number(stats.animalHandling);
    this.insight = Number(stats.insight);
    this.medicine = Number(stats.medicine);
    this.perception = Number(stats.perception);
    this.survival = Number(stats.survival);
    this.charisma = Number(stats.charisma);
    this.deception = Number(stats.deception);
    this.intimidation = Number(stats.intimidation);
    this.performance = Number(stats.performance);
    this.persuasion = Number(stats.persuasion);
    this.createdAt = new Date(stats.createdAt);
    this.updatedAt = new Date(stats.updatedAt);

    let calc = 0;

    calc = Math.floor(this.strength / 2 - 5)
    if (calc > 0) {
      this.strengthMod = "+" + calc
    } else {
      this.strengthMod = "" + calc
    }
    calc = Math.floor(this.dexterity / 2 - 5)
    if (calc > 0) {
      this.dexterityMod = "+" + calc
    } else {
      this.dexterityMod = "" + calc
    }
    calc = Math.floor(this.constitution / 2 - 5)
    if (calc > 0) {
      this.constitutionMod = "+" + calc
    } else {
      this.constitutionMod = "" + calc
    }
    calc = Math.floor(this.intelligence / 2 - 5)
    if (calc > 0) {
      this.intelligenceMod = "+" + calc
    } else {
      this.intelligenceMod = "" + calc
    }
    calc = Math.floor(this.wisdom / 2 - 5)
    if (calc > 0) {
      this.wisdomMod = "+" + calc
    } else {
      this.wisdomMod = "" + calc
    }
    calc = Math.floor(this.charisma / 2 - 5)
    if (calc > 0) {
      this.charismaMod = "+" + calc
    } else {
      this.charismaMod = "" + calc
    }
  }

  updateCharacterInfo(stats: any) {
    this.class = stats.class;
    this.race = stats.race;
    this.photo = stats.photo ? `https://${localIP}:8080${stats.photo}` : '';
    this.level = stats.level;
  }
  
  rollDice(event: Event) {
    const target = event.target as HTMLElement;
    let modifierString = target.innerText.trim(); // Get the text inside <p>
    let resultMessage = '';

    if (modifierString[0] === '(') {
      modifierString = modifierString.slice(1, -1); // Remove the first '(' and last ')' characters
    }
    
    const modifier = parseInt(modifierString, 10);  // Convert string to number
    const roll = Math.floor(Math.random() * 20) + 1;  // Roll a D20
    

    if (roll === 20) {
      resultMessage = 'Natural 20!';  // Ignore modifier
    } else if (roll === 1) {
      resultMessage = 'Natural 1...';  // Ignore modifier
    } else {
      const finalResult = roll + modifier;
      resultMessage = `You have rolled a ${roll} with a modifier of ${modifier >= 0 ? '+' + modifier : modifier} and got ${finalResult}`;
    }


    this.resultRolled.emit(resultMessage);
  }

  onImageUpload(event: any) {
    const file = event.target.files[0];
    if (file && this.characterID) {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('characterID', this.characterID);
  
      this.http.post(`https://${localIP}:8080/save-image-board`, formData)
        .subscribe(
          (response: any) => {
            this.photo = `https://${localIP}:8080${response.filePath}`;
            this.updateCharacterPhoto(response.filePath); // Use relative path
          },
          (error) => {
            console.error('Error uploading image:', error);
          }
        );
    } else {
      console.error('File or characterID is not set');
    }
  }
  
  updateCharacterPhoto(photoUrl: string) {
    if (!this.characterID) {
      console.error('Character ID is not set');
      return;
    }
    console.log('Updating character photo:', photoUrl);
    this.http.put(`https://${localIP}:8080/character-info-board/${this.characterID}/photo`, { photo: photoUrl })
      .subscribe(
        () => {
          console.log('Character photo updated successfully');
        },
        (error) => {
          console.error('Error updating character photo:', error);
        }
      );
  }
}

