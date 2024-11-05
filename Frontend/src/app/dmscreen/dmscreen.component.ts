import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { localIP } from '../config'; // Import localIP from config

@Component({
  selector: 'app-dmscreen',
  standalone: true,
  imports: [CommonModule, FormsModule], // Add FormsModule to imports
  templateUrl: './dmscreen.component.html',
  styleUrls: ['./dmscreen.component.css']
})
export class DMScreenComponent implements OnInit {
  characters: { name: string, photo: string }[] = [];
  currentlySelectedCharacter: string | null = null; // Add this variable
  statsSheet: any = {}; // Add this variable to store stats sheet
  selectedView: string = 'Edit Stats'; // Add this variable to store the selected view
  newFamilyMember: any = null; // Initialize as null
  familyMembers: any[] = []; // Add this variable to store family members
  newFriendMember: any = null; // Initialize as null
  friendMembers: any[] = []; // Add this variable to store friend members

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchCharacterNames();
  }

  fetchCharacterNames() {
    this.http.get<{ characterName: string, photo: string }[]>(`https://${localIP}:8080/character-names`).subscribe(
      (data) => {
        this.characters = data.map(character => ({
          name: character.characterName,
          photo: character.photo ? `https://${localIP}:8080${character.photo}` : ''
        }));
      },
      (error) => {
        console.error('Error fetching character names:', error);
      }
    );
  }

  selectCharacter(name: string) {
    this.currentlySelectedCharacter = name;
    console.log('Currently selected character:', this.currentlySelectedCharacter);
    this.fetchStatsSheet(name);
    this.fetchFamilyMembers(name); // Fetch family members for the selected character
    this.fetchFriendMembers(name); // Fetch family members for the selected character
  }

  fetchStatsSheet(characterName: string) {
    this.http.get<any>(`https://${localIP}:8080/stats-sheet/${characterName}`).subscribe(
      (data) => {
        this.statsSheet = data;
      },
      (error) => {
        console.error('Error fetching stats sheet:', error);
      }
    );
  }

  fetchFamilyMembers(characterName: string) {
    this.http.get<any[]>(`https://${localIP}:8080/character-info/${characterName}/family-members`).subscribe(
      (data) => {
        this.familyMembers = data.map(member => ({
          ...member,
          photo: member.photo ? `https://${localIP}:8080${member.photo}` : ''
        }));
        console.log('Family members:', this.familyMembers); // Log the family members array
      },
      (error) => {
        console.error('Error fetching family members:', error);
      }
    );
  }

  fetchFriendMembers(characterName: string) {
    this.http.get<any[]>(`https://${localIP}:8080/character-info/${characterName}/friend-members`).subscribe(
      (data) => {
        this.friendMembers = data.map(member => ({
          ...member,
          photo: member.photo ? `https://${localIP}:8080${member.photo}` : ''
        }));
        console.log('Friend members:', this.friendMembers); // Log the friend members array
      },
      (error) => {
        console.error('Error fetching friend members:', error);
      }
    );
  }

  saveStatsSheet() {
    this.http.put(`https://${localIP}:8080/stats-sheet/${this.currentlySelectedCharacter}`, this.statsSheet).subscribe(
      () => {
        console.log('Stats sheet saved successfully');
      },
      (error) => {
        console.error('Error saving stats sheet:', error);
      }
    );
  }

  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  changeView(view: string) {
    this.selectedView = view;
  }

  addFamilyMember() {
    this.newFamilyMember = { characterName: '', age: '', race: '', photo: '' };
  }

  addFriendMember() {
    this.newFriendMember = { characterName: '', age: '', race: '', photo: '' };
  }

  saveFamilyMember() {
    const familyMemberData = { ...this.newFamilyMember, characterName: this.newFamilyMember.characterName };
    this.http.post(`https://${localIP}:8080/character-info/${this.currentlySelectedCharacter}/family-member`, familyMemberData).subscribe(
      (data: any) => {
        console.log('Family member saved successfully');
        this.updateCharacterFamilyMembers(data.id);
      },
      (error) => {
        console.error('Error saving family member:', error);
      }
    );
  }

  saveFriendMember() {
    const friendMemberData = { ...this.newFriendMember, characterName: this.newFriendMember.characterName };
    this.http.post(`https://${localIP}:8080/character-info/${this.currentlySelectedCharacter}/friend-member`, friendMemberData).subscribe(
      (data: any) => {
        console.log('Friend member saved successfully');
        this.updateCharacterFriendMembers(data.id);
      },
      (error) => {
        console.error('Error saving friend member:', error);
      }
    );
  }

  updateCharacterFamilyMembers(familyMemberId: number) {
    this.http.put(`https://${localIP}:8080/character-info/${this.currentlySelectedCharacter}/family-members`, { familyMemberId }).subscribe(
      () => {
        console.log('Character family members updated successfully');
      },
      (error) => {
        console.error('Error updating character family members:', error);
      }
    );
  }

  updateCharacterFriendMembers(friendMemberId: number) {
    this.http.put(`https://${localIP}:8080/character-info/${this.currentlySelectedCharacter}/friend-members`, { friendMemberId }).subscribe(
      () => {
        console.log('Character friend members updated successfully');
      },
      (error) => {
        console.error('Error updating character friend members:', error);
      }
    );
  }

  saveImage(formData: FormData) {
    this.http.post(`https://${localIP}:8080/save-image`, formData).subscribe(
      (response: any) => {
        if (this.newFamilyMember) {
          this.newFamilyMember.photo = response.filePath; // Save as relative URL
        } else if (this.newFriendMember) {
          this.newFriendMember.photo = response.filePath; // Save as relative URL
        }
        console.log('Image saved successfully');
      },
      (error) => {
        console.error('Error saving image:', error);
      }
    );
  }

  onImageUploadFamily(event: any) {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('characterName', this.newFamilyMember.characterName || ''); // Use new family member's character name
      this.saveImage(formData);
    }
  }

  onImageUploadFriend(event: any) {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('characterName', this.newFriendMember.characterName || ''); // Use new friend member's character name
      this.saveImage(formData);
    }
  }
}
