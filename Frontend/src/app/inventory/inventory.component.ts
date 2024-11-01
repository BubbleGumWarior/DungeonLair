import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { localIP } from '../config'; // Import the IP address

interface Item {
  itemName: string;
  type: string;
  damage: string;
  mainStat: string;
  modifier: string;
  description: string;
  photo: string; // This will now hold Base64 strings
}

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.css'] // Fixed typo: should be styleUrls instead of styleUrl
})
export class InventoryComponent implements OnInit {
  Item: Item[] = [];
  itemList: number[] = [];
  strength: number = 0;
  dexterity: number = 0;
  constitution: number = 0;
  intelligence: number = 0;
  wisdom: number = 0;
  charisma: number = 0;
  marksmanship: string = "";
  swordsmanship: string = "";

  @Input() characterName: string | null = '';
  @Output() resultRolled = new EventEmitter<string>();

  ngOnInit() {
    if (this.characterName) {
      this.fetchItemList(this.characterName);
    }
  }

  async fetchItemList(characterName: string) {
    try {
      const response = await fetch(`https://${localIP}:8080/character-info/${characterName}`);
      if (!response.ok) throw new Error('Failed to fetch item list');
      
      const itemListData = await response.json();
      this.updateItemList(itemListData);  // Update friend members with the fetched data
      await this.fetchItemById(); // Fetch friend members' details after getting IDs
    } catch (error) {
      console.error('Error fetching item list:', error);
    }
  }

  updateItemList(itemListData: any) {
    this.itemList = itemListData.itemInventory; // Assuming itemInventory is an array of IDs
  }

  async fetchItemById() {
    try {
      const fetchPromises = this.itemList.map(async (itemID) => {
        const response = await fetch(`https://${localIP}:8080/item-list/${itemID}`);
        if (!response.ok) throw new Error(`Failed to fetch item list with ID ${itemID}`);
        
        const item: Item = await response.json();
        this.updateItem(item);
      });
      
      // Wait for all fetch requests to complete
      await Promise.all(fetchPromises);
    } catch (error) {
      console.error('Error fetching item list details:', error);
    }
  }

  async updateItem(item: Item) {  
    item.modifier = await this.fetchStatsSheet(this.characterName, item.mainStat);

    this.Item.push(item);
  }


  async fetchStatsSheet(characterName: string | null, mainStat: string) {
    try {
      const response = await fetch(`https://${localIP}:8080/stats-sheet/${characterName}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const statsSheet = await response.json();
      let modifier = this.updateStats(statsSheet, mainStat);  // Update stats with the fetched data
      return modifier
    } catch (error) {
      console.error('Error fetching stats sheet:', error);
      return "0"
    }
  }

  updateStats(stats: any, mainStat: string) {
    let modifier: string = "";
    let usingStat: number = 0;

    this.strength = stats.strength;
    this.dexterity = stats.dexterity;
    this.constitution = stats.constitution;
    this.intelligence = stats.intelligence;
    this.wisdom = stats.wisdom;
    this.charisma = stats.charisma;
    this.marksmanship = stats.marksmanship;
    this.swordsmanship = stats.swordsmanship;

    let calc = 0;

    if (mainStat === "Strength") {
      usingStat = this.strength
    } else if (mainStat === "Dexterity"){
      usingStat = this.dexterity
    } else if (mainStat === "Constitution"){
      usingStat = this.constitution
    } else if (mainStat === "Intelligence"){
      usingStat = this.intelligence
    } else if (mainStat === "Wisdom"){
      usingStat = this.wisdom
    } else if (mainStat === "Charisma"){
      usingStat = this.charisma
    }

    calc = Math.floor(usingStat / 2 - 5)
    if (calc > 0) {
      modifier = "+" + calc
    } else {
      modifier = "" + calc
    }

    if (mainStat === "Marksmanship") {
      modifier = this.marksmanship; // Convert string to number
    } else if (mainStat === "Swordsmanship") {
      modifier = this.swordsmanship; // Convert string to number
    }
    return modifier
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
        resultMessage = `You have rolled a ${roll} with a modifier of ${modifier >= 0 ? '+' + modifier : modifier} and got ${finalResult}`;
      }


      this.resultRolled.emit(resultMessage);
    }
    
  }

  formatDescription(description: string): string {
    return description.replace(/\\n/g, '<br>');
  }

}
