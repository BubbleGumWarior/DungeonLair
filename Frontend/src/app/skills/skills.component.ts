import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { localIP } from '../config'; // Import the IP address
import { HttpClient } from '@angular/common/http'; // Import HttpClient

interface Skill {
  skillName: string;
  description: string;
  mainStat: string;
  diceRoll: string;
  modifier: string;
}

interface StatsSheet {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  // Add other stats as needed
}

@Component({
  selector: 'app-skills',
  standalone: true,
  imports: [CommonModule, FormsModule], // Add FormsModule to imports
  templateUrl: './skills.component.html',
  styleUrls: ['./skills.component.css'] // Fixed typo: should be styleUrls instead of styleUrl
})
export class SkillsComponent implements OnInit {
  Skill: Skill[] = [];
  skillList: number[] = [];
  strength: number = 0;
  dexterity: number = 0;
  constitution: number = 0;
  intelligence: number = 0;
  wisdom: number = 0;
  charisma: number = 0;
  marksmanship: string = "";
  swordsmanship: string = "";
  forceStrength: string = "";
  stealth: string = "";
  pilot: string = "";
  perception: string = "";
  splicing: string = "";
  athletics: string = "";
  mapping: string = "";
  persuasion: string = "";
  searchQuery: string = ''; // Add searchQuery property
  sortCriteria: string = 'alphabetically'; // Add sortCriteria property
  filteredSkills: Skill[] = []; // Add filteredSkills property
  statsSheet: StatsSheet | null = null; // Add statsSheet property

  @Input() characterID: string | null = '';
  @Output() resultRolled = new EventEmitter<string>();

  constructor(private http: HttpClient) {} // Add HttpClient to the constructor

  ngOnInit() {
    if (this.characterID) {
      this.fetchSkills(this.characterID);
      this.fetchStatsSheet(this.characterID); // Fetch stats sheet
    }
  }

  fetchStatsSheet(characterID: string) {
    this.http.get<StatsSheet>(`https://${localIP}:8080/stats-sheet/${characterID}`).subscribe(
      (data) => {
        this.statsSheet = data;
        this.assignModifiers(); // Assign modifiers after fetching stats sheet
      },
      (error) => {
        console.error('Error fetching stats sheet:', error);
      }
    );
  }

  fetchSkills(characterID: string) {
    this.http.get<Skill[]>(`https://${localIP}:8080/skill-list/${characterID}`).subscribe(
      (data) => {
        this.Skill = data;
        this.assignModifiers(); // Assign modifiers after fetching skills
        this.filterAndSortSkills(); // Filter and sort skills after fetching
      },
      (error) => {
        console.error('Error fetching skills:', error);
      }
    );
  }

  assignModifiers() {
    if (this.statsSheet) {
      this.Skill = this.Skill.map(skill => {
        let mainStatValue = this.statsSheet![skill.mainStat.toLowerCase() as keyof StatsSheet] || 0;
        
        // Apply Dungeons and Dragons modifier values for specific main stats
        if (['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].includes(skill.mainStat.toLowerCase())) {
          mainStatValue = Math.floor((mainStatValue - 10) / 2);
        }

        return {
          ...skill,
          modifier: (mainStatValue >= 0 ? '+' + mainStatValue : mainStatValue.toString())
        };
      });
      this.filterAndSortSkills(); // Ensure filteredSkills is updated after assigning modifiers
    }
  }

  filterAndSortSkills() {
    this.filteredSkills = this.Skill.filter(skill =>
      skill.skillName.toLowerCase().includes(this.searchQuery.toLowerCase())
    );

    switch (this.sortCriteria) {
      case 'alphabetically':
        this.filteredSkills.sort((a, b) => a.skillName.localeCompare(b.skillName));
        break;
      case 'diceRoll':
        this.filteredSkills.sort((a, b) => parseInt(b.diceRoll) - parseInt(a.diceRoll)); // Sort diceRoll in descending order
        break;
      case 'mainStat':
        this.filteredSkills.sort((a, b) => a.mainStat.localeCompare(b.mainStat));
        break;
      default:
        break;
    }
  }

  setSortCriteria(criteria: string) {
    this.sortCriteria = criteria;
    this.filterAndSortSkills(); // Sort skills when criteria changes
  }

  rollDice(event: Event) {
    const target = event.currentTarget as HTMLElement;
    const damageText = target.querySelector('.text-3xl:nth-of-type(1)') as HTMLElement;
    const modifierText = target.querySelector('.text-3xl:nth-of-type(2)') as HTMLElement;
    const diceSizeText = damageText.innerText.trim();
    const modifierValueText = modifierText.innerText.trim();
    let resultMessage = '';

    const diceSize = diceSizeText.slice(1, diceSizeText.length);

    const diceRoll = parseInt(diceSize, 10); 

    if (diceRoll < 1) {
      this.resultRolled.emit('Can not roll a dice value of less than 1!');
    } else {                  
      const modifier = parseInt(modifierValueText, 10);  // Convert string to number
      const roll = Math.floor(Math.random() * diceRoll) + 1;  // Roll a dice
      
      if (roll === diceRoll) {
        resultMessage = `Critical ${diceRoll}!!!`;  // Ignore modifier
      } else if (roll === 1) {
        resultMessage = 'Natural 1...';  // Ignore modifier
      } else {
        const finalResult = roll + modifier;
        resultMessage = `has rolled a ${roll} with a modifier of ${modifier >= 0 ? '+' + modifier : modifier} and got ${finalResult}`;
      } 
      this.resultRolled.emit(resultMessage);
    }
  }
}
