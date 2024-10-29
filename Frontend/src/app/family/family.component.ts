import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Character {
  characterName: string;
  age: number;
  race: string;
  relationship: string;
  photo: string; // This will now hold Base64 strings
}

@Component({
  selector: 'app-family',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './family.component.html',
  styleUrls: ['./family.component.css'] // Fixed typo: should be styleUrls instead of styleUrl
})
export class FamilyComponent implements OnInit {
  Characters: Character[] = [];
  familyMembers: number[] = [];
  @Input() characterName: string | null = '';

  ngOnInit() {
    if (this.characterName) {
      this.fetchFamilyMembers(this.characterName);
    }
  }

  async fetchFamilyMembers(characterName: string) {
    try {
      const response = await fetch(`http://localhost:3000/character-info/${characterName}`);
      if (!response.ok) throw new Error('Failed to fetch family members');
      
      const familyData = await response.json();
      this.updateFamilyMembers(familyData);  // Update family members with the fetched data
      await this.fetchFamilyById(); // Fetch family members' details after getting IDs
    } catch (error) {
      console.error('Error fetching family members:', error);
    }
  }

  updateFamilyMembers(familyData: any) {
    this.familyMembers = familyData.familyMembers; // Assuming familyMembers is an array of IDs
  }

  async fetchFamilyById() {
    try {
      const fetchPromises = this.familyMembers.map(async (familyMemberID) => {
        const response = await fetch(`http://localhost:3000/family-member/${familyMemberID}`);
        if (!response.ok) throw new Error(`Failed to fetch family member with ID ${familyMemberID}`);
        
        const character: Character = await response.json();
        this.updateCharacters(character);
      });
      
      // Wait for all fetch requests to complete
      await Promise.all(fetchPromises);
    } catch (error) {
      console.error('Error fetching family member details:', error);
    }
  }

  updateCharacters(character: Character) {
    // Append the fetched character to the Characters array
    this.Characters.push(character);
  }
}
