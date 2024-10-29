import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Character {
  characterName: string;
  age: number;
  race: string;
  photo: string; // This will now hold Base64 strings
}

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './friends.component.html',
  styleUrls: ['./friends.component.css'] // Fixed typo: should be styleUrls instead of styleUrl
})
export class FriendsComponent implements OnInit {
  Characters: Character[] = [];  
  friendMembers: number[] = [];
  @Input() characterName: string | null = '';

  ngOnInit() {
    if (this.characterName) {
      this.fetchFriendMembers(this.characterName);
    }
  }

  async fetchFriendMembers(characterName: string) {
    try {
      const response = await fetch(`http://localhost:3000/character-info/${characterName}`);
      if (!response.ok) throw new Error('Failed to fetch friend members');
      
      const friendData = await response.json();
      this.updateFriendMembers(friendData);  // Update friend members with the fetched data
      await this.fetchFriendById(); // Fetch friend members' details after getting IDs
    } catch (error) {
      console.error('Error fetching friend members:', error);
    }
  }

  updateFriendMembers(friendData: any) {
    this.friendMembers = friendData.friendMembers; // Assuming friendMembers is an array of IDs
  }

  async fetchFriendById() {
    try {
      const fetchPromises = this.friendMembers.map(async (friendMemberID) => {
        const response = await fetch(`http://localhost:3000/friend-member/${friendMemberID}`);
        if (!response.ok) throw new Error(`Failed to fetch friend member with ID ${friendMemberID}`);
        
        const character: Character = await response.json();
        this.updateCharacters(character);
      });
      
      // Wait for all fetch requests to complete
      await Promise.all(fetchPromises);
    } catch (error) {
      console.error('Error fetching friend member details:', error);
    }
  }

  updateCharacters(character: Character) {
    // Append the fetched character to the Characters array
    this.Characters.push(character);
  }
}
