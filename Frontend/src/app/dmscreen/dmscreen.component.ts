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
  newInventoryItem: any = null; // Initialize as null
  inventoryItems: any[] = []; // Add this variable to store inventory items
  skillList: any[] = []; // Add this variable to store skills
  newSkill: any = null; // Initialize as null
  hoveredItem: any = null; // Add this variable to store the hovered item
  selectedSkill: any = null; // Add this variable to store the selected skill
  selectedInventoryItem: any = null; // Add this variable to store the selected inventory item

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchCharacterNames();
  }

  fetchCharacterNames() {
    this.http.get<{ characterName: string, photo: string }[]>(`https://${localIP}:8080/character-names`).subscribe(
      (data) => {
        this.characters = data
          .map(character => ({
            name: character.characterName,
            photo: character.photo ? `https://${localIP}:8080${character.photo}` : ''
          }))
          .sort((a, b) => a.name.localeCompare(b.name)); // Sort characters alphabetically by name
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
    this.fetchInventoryItems(name); // Fetch inventory items for the selected character
    this.fetchSkills(name); // Fetch skills for the selected character
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

  fetchInventoryItems(characterName: string) {
    this.http.get<any[]>(`https://${localIP}:8080/character-info/${characterName}/inventory-items`).subscribe(
      (data) => {
        this.inventoryItems = data.map(item => ({
          ...item,
          photo: item.photo ? `https://${localIP}:8080${item.photo}` : ''
        })).sort((a, b) => a.itemName.localeCompare(b.itemName)); // Sort items alphabetically by name
        console.log('Inventory items:', this.inventoryItems); // Log the inventory items array
      },
      (error) => {
        console.error('Error fetching inventory items:', error);
      }
    );
  }

  fetchSkills(characterName: string) {
    this.http.get<any[]>(`https://${localIP}:8080/character-info/${characterName}/skills`).subscribe(
      (data) => {
        this.skillList = data.sort((a, b) => a.skillName.localeCompare(b.skillName)); // Sort skills alphabetically by name
        console.log('Skills:', this.skillList); // Log the skills array
      },
      (error) => {
        console.error('Error fetching skills:', error);
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

  addInventoryItem() {
    this.newInventoryItem = { itemName: '', type: '', mainStat: '', description: '', damage: '', photo: '' };
  }

  addSkill() {
    this.newSkill = { skillName: '', mainStat: '', description: '', diceRoll: '' };
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
        if (error.status === 500) {
          console.error('Internal Server Error: Failed to save friend member');
        }
      }
    );
  }

  saveInventoryItem() {
    const inventoryItemData = { 
      ...this.newInventoryItem, 
      itemName: this.newInventoryItem.itemName,
      description: this.newInventoryItem.description.replace(/\n/g, '\\n') // Replace new lines with \n
    };
    this.http.post(`https://${localIP}:8080/character-info/${this.currentlySelectedCharacter}/inventory-item`, inventoryItemData).subscribe(
      (data: any) => {
        console.log('Inventory item saved successfully');
        this.inventoryItems.push(data); // Add the new item to the inventoryItems array
        this.newInventoryItem = null; // Reset the newInventoryItem
      },
      (error) => {
        console.error('Error saving inventory item:', error);
      }
    );
  }

  saveSkill() {
    const skillData = { ...this.newSkill, skillName: this.newSkill.skillName };
    this.http.post(`https://${localIP}:8080/character-info/${this.currentlySelectedCharacter}/skill`, skillData).subscribe(
      (data: any) => {
        console.log('Skill saved successfully');
        this.skillList.push(data); // Add the new skill to the skillList array
        this.newSkill = null; // Reset the newSkill
      },
      (error) => {
        console.error('Error saving skill:', error);
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

  updateCharacterInventoryItems(itemId: number) {
    this.http.put(`https://${localIP}:8080/character-info/${this.currentlySelectedCharacter}/inventory-items`, { itemId }).subscribe(
      () => {
        console.log('Character inventory items updated successfully');
      },
      (error) => {
        console.error('Error updating character inventory items:', error);
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
        } else if (this.newInventoryItem) {
          this.newInventoryItem.photo = response.filePath; // Save as relative URL
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

  onImageUploadInventory(event: any) {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('itemName', this.newInventoryItem.itemName || ''); // Use new inventory item's name
      this.saveImage(formData);
    }
  }

  showItemModal(item: any) {
    this.hoveredItem = item;
  }

  hideItemModal() {
    this.hoveredItem = null;
  }

  formatDescription(description: string): string {
    return description.replace(/\\n/g, '<br>');
  }

  selectSkill(skill: any) {
    this.selectedSkill = skill;
  }

  selectInventoryItem(item: any) {
    this.selectedInventoryItem = item;
  }

  deleteSkill() {
    if (this.selectedSkill) {
      this.http.delete(`https://${localIP}:8080/character-info/${this.currentlySelectedCharacter}/skill/${this.selectedSkill.skillID}`).subscribe(
        () => {
          console.log('Skill deleted successfully');
          this.skillList = this.skillList.filter(skill => skill !== this.selectedSkill);
          this.selectedSkill = null;
        },
        (error) => {
          console.error('Error deleting skill:', error);
        }
      );
    }
  }

  deleteInventoryItem() {
    if (this.selectedInventoryItem) {
      this.http.delete(`https://${localIP}:8080/character-info/${this.currentlySelectedCharacter}/inventory-item/${this.selectedInventoryItem.itemID}`).subscribe(
        () => {
          console.log('Inventory item deleted successfully');
          this.inventoryItems = this.inventoryItems.filter(item => item !== this.selectedInventoryItem);
          this.selectedInventoryItem = null;
        },
        (error) => {
          console.error('Error deleting inventory item:', error);
        }
      );
    }
  }
}
