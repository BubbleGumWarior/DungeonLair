import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { HttpClient } from '@angular/common/http'; // Import HttpClient
import { localIP } from '../config'; // Import the IP address

interface Item {
  itemName: string;
  type: string;
  damage: string;
  mainStat: string;
  modifier: string;
  description: string;
  photo: string; // This will now hold Base64 strings
  equipped?: boolean; // Add equipped property (optional)
}

interface StatsSheet {
  strength: number;
  athletics: number;
  dexterity: number;
  acrobatics: number;
  sleightOfHand: number;
  stealth: number;
  constitution: number;
  intelligence: number;
  history: number;
  investigation: number;
  nature: number;
  wisdom: number;
  animalHandling: number;
  insight: number;
  medicine: number;
  perception: number;
  survival: number;
  charisma: number;
  deception: number;
  intimidation: number;
  performance: number;
  persuasion: number;
}

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule], // Add FormsModule to imports
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.css'] // Fixed typo: should be styleUrls instead of styleUrl
})
export class InventoryComponent implements OnInit {
  Item: Item[] = [];
  itemList: number[] = [];
  searchQuery: string = ''; // Add searchQuery property
  sortCriteria: string = 'alphabetically'; // Add sortCriteria property
  statsSheet: StatsSheet | null = null; // Add statsSheet property
  

  @Input() characterID: string | null = '';
  @Output() resultRolled = new EventEmitter<string>();

  constructor(private http: HttpClient) {} // Add HttpClient to the constructor

  ngOnInit() {
    if (this.characterID) {
      this.fetchInventoryItems(this.characterID);
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

  fetchInventoryItems(characterID: string) {
    this.http.get<Item[]>(`https://${localIP}:8080/inventory-item/${characterID}`).subscribe(
      (data) => {
        this.Item = data.map(item => ({
          ...item,
          photo: item.photo ? `https://${localIP}:8080${item.photo}` : ''
        }));
        this.assignModifiers(); // Assign modifiers after fetching items
        this.sortItems(); // Sort items after fetching
        this.sortClothing(); // Always sort clothing alphabetically
      },
      (error) => {
        console.error('Error fetching inventory items:', error);
      }
    );
  }

  assignModifiers() {
    if (this.statsSheet) {
      this.Item = this.Item.map(item => {
        let mainStatValue = this.statsSheet![item.mainStat.toLowerCase() as keyof StatsSheet] || 0;
        
        // Apply Dungeons and Dragons modifier values for specific main stats
        if (['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].includes(item.mainStat.toLowerCase())) {
          mainStatValue = Math.floor((mainStatValue - 10) / 2);
        }

        return {
          ...item,
          modifier: mainStatValue.toString()
        };
      });
    }
  }

  get ItemFiltered() {
    // Filter items based on search query
    if (this.sortCriteria === 'clothing') {
      return this.Item.filter(item => item.type === 'Clothing');
    }
    // Exclude clothing items by default
    return this.Item.filter(item => item.type !== 'Clothing');
  }

  setSortCriteria(criteria: string) {
    this.sortCriteria = criteria;
    if (criteria !== 'clothing') {
      this.sortItems(); // Sort items when criteria changes, except for clothing filter
    }
    this.sortClothing(); // Always sort clothing alphabetically
  }

  sortItems() {
    switch (this.sortCriteria) {
      case 'alphabetically':
        this.Item.sort((a, b) => a.itemName.localeCompare(b.itemName));
        break;
      case 'damage':
        this.Item.sort((a, b) => parseInt(b.damage) - parseInt(a.damage)); // Sort damage in descending order
        break;
      case 'type':
        this.Item.sort((a, b) => a.type.localeCompare(b.type));
        break;
      case 'mainStat':
        this.Item.sort((a, b) => {
          const aStat = this.statsSheet![a.mainStat.toLowerCase() as keyof StatsSheet] || 0;
          const bStat = this.statsSheet![b.mainStat.toLowerCase() as keyof StatsSheet] || 0;
          return bStat - aStat; // Sort in descending order
        });
        break;
      default:
        break;
    }
    this.sortClothing(); // Always sort clothing alphabetically after any sort
  }

  sortClothing() {
    // Sort clothing items alphabetically within the Item array
    const clothing = this.Item.filter(item => item.type === 'Clothing').sort((a, b) => a.itemName.localeCompare(b.itemName));
    const nonClothing = this.Item.filter(item => item.type !== 'Clothing');
    this.Item = [...nonClothing, ...clothing];
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
        resultMessage = `rolled a Critical ${diceRoll}!!!`;  // Ignore modifier
      } else if (roll === 1) {
        resultMessage = 'rolled a Natural 1...';  // Ignore modifier
      } else {
        const finalResult = roll + modifier;
        resultMessage = `rolled a ${roll} with a modifier of ${modifier >= 0 ? '+' + modifier : modifier} and got ${finalResult}`;
      }


      this.resultRolled.emit(resultMessage);
    }
    
  }

  formatDescription(description: string): string {
    return description.replace(/\\n/g, '<br>');
  }

  onEquipClick(item: Item) {
    if (!this.characterID) return;
    // Assuming item has an 'itemID' property. Adjust if the property name is different.
    const payload = {
      characterID: this.characterID,
      itemID: (item as any).itemID // Cast to any if itemID is not in the Item interface
    };
    this.http.post(`https://${localIP}:8080/equip-item`, payload).subscribe({
      next: (response) => {
        // Refresh inventory after equipping item
        this.fetchInventoryItems(this.characterID!);
        this.sortClothing(); // Ensure clothing is sorted after equipping
      },
      error: (error) => {
        console.error('Error equipping item:', error);
      }
    });
  }

}
