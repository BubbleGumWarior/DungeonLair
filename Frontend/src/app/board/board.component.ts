import { Component, Input, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { localIP } from '../config'; // Import the IP address

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [ CommonModule ],
  templateUrl: './board.component.html',
  styleUrl: './board.component.css'
})
export class BoardComponent implements OnInit {
  @Input() characterName: string | null = '';
  @Output() resultRolled = new EventEmitter<string>();

  showPopup: boolean = false;
  rollResult: number = 0;
  
  strength: number = 0;
  strengthMod: string = "";
  athletics: number = 0;
  swordsmanship: number = 0;

  dexterity: number = 0;
  dexterityMod: string = "";
  acrobatics: number = 0;
  sleightOfHand: number = 0;
  stealth: number = 0;
  marksmanship: number = 0;
  pilot: number = 0;

  constitution: number = 0;
  constitutionMod: string = "";

  intelligence: number = 0;
  intelligenceMod: string = "";
  history: number = 0;
  investigation: number = 0;
  nature: number = 0;
  forceStrength: number = 0;
  splicing: number = 0;

  wisdom: number = 0;
  wisdomMod: string = "";
  animalHandling: number = 0;
  insight: number = 0;
  medicine: number = 0;
  perception: number = 0;
  survival: number = 0;
  forceCapacity: number = 0;
  mapping: number = 0;

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

  constructor(private http: HttpClient) {}

  ngOnInit() {
    if (this.characterName) {
      this.fetchStatsSheet(this.characterName);
      this.fetchCharacterInfo(this.characterName)
    }
  }

  fetchStatsSheet(characterName: string) {
    this.http.get(`https://${localIP}:8080/stats-sheet/${characterName}`)
      .subscribe(
        (data: any) => {
          this.statsSheet = data;
          this.updateStats(data);  // Update stats with the fetched data
        },
        (error) => {
          console.error('Error fetching stats sheet:', error);
        }
      );
  }

  async fetchCharacterInfo(characterName: string) {
    try {
      const response = await fetch(`https://${localIP}:8080/character-info/${characterName}`);
      if (!response.ok) throw new Error('Failed to fetch info');
      
      const characterInfo = await response.json();
      this.updateCharacterInfo(characterInfo);  // Update stats with the fetched data
    } catch (error) {
      console.error('Error fetching stats sheet:', error);
    }
  }

  updateStats(stats: any) {
    this.strength = stats.strength;
    this.athletics = stats.athletics;
    this.swordsmanship = stats.swordsmanship;
    this.dexterity = stats.dexterity;
    this.acrobatics = stats.acrobatics;
    this.sleightOfHand = stats.sleightOfHand;
    this.stealth = stats.stealth;
    this.marksmanship = stats.marksmanship;
    this.pilot = stats.pilot;
    this.constitution = stats.constitution;
    this.intelligence = stats.intelligence;
    this.history = stats.history;
    this.investigation = stats.investigation;
    this.nature = stats.nature;
    this.forceStrength = stats.forceStrength;
    this.splicing = stats.splicing;
    this.wisdom = stats.wisdom;
    this.animalHandling = stats.animalHandling;
    this.insight = stats.insight;
    this.medicine = stats.medicine;
    this.perception = stats.perception;
    this.survival = stats.survival;
    this.forceCapacity = stats.forceCapacity;
    this.mapping = stats.mapping;
    this.charisma = stats.charisma;
    this.deception = stats.deception;
    this.intimidation = stats.intimidation;
    this.performance = stats.performance;
    this.persuasion = stats.persuasion;
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
    this.photo = stats.photo;
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
}

