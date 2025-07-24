import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { localIP } from '../config'; // Import localIP from config
import { WebSocketService } from '../services/websocket.service'; // Import WebSocketService

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
  currentlySelectedCharacterID: string | null = null; // Add this variable
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
  allCharacters: { name: string, id: string }[] = []; // Add this variable to store all characters
  selectedFamilyMember: string | null = null; // Add this variable to store the selected family member
  selectedFriendMember: string | null = null; // Add this variable to store the selected friend member
  newMask: any = { 
    photo: '', 
    passiveSkill: '', 
    activeSkills: '', 
    attackDamage: 0, 
    abilityDamage: 0, 
    magicResist: 0, // Corrected typo
    protections: 0, 
    health: 0, 
    speed: 0 
  }; // Initialize with new fields
  maskDetails: any = {}; // Add this variable to store mask details
  maskList: any[] = []; // Add this variable to store masks
  maskOwner: any[] = []; // Add this variable to store mask owners
  selectedMaskID: number | null = null; // Add this variable to store the selected mask ID
  newMaskSkill: any = { 
    skillName: '', 
    description: '', 
    mainStat: '', 
    mainStatPercentage: 0, 
    cooldown: 0,
    amountOfStrikes: 1, // Default value is 1
    onHitEffect: 'None', // Default value is 'None'
    isMultiTarget: false // Add this property
  }; // Initialize new mask skill
  newMaskMod: any = { modType: '', modRarity: 0, description: '' }; // Add this variable to store new mod details

  maskUsers: { name: string, photo: string }[] = [];
  civilians: { name: string, photo: string }[] = [];

  // New properties for manage mask functionality
  manageMaskId: number | null = null;
  loadedMaskDetails: any = {};
  characterCurrentMaskId: number | null = null; // Store the character's current mask ID
  localIP = localIP; // Make localIP accessible in template

  constructor(private http: HttpClient, private websocketService: WebSocketService) {} // Inject WebSocketService

  ngOnInit() {
    this.fetchCharacterNames();
    this.fetchAllCharacters(); // Fetch all characters on initialization
    this.fetchMasks(); // Fetch all masks on initialization
  }

  fetchCharacterNames() {
    this.http.get<{ characterName: string, photo: string, maskID: number | null }[]>(`https://${localIP}:443/character-names`).subscribe(
      (data) => {
        // Separate mask users and civilians based on maskID
        const maskUsers: { name: string, photo: string }[] = [];
        const civilians: { name: string, photo: string }[] = [];
        data.forEach(character => {
          const charObj = {
            name: character.characterName,
            photo: character.photo ? `https://${localIP}:443${character.photo}` : ''
          };
          if (character.maskID !== null && character.maskID !== undefined) {
            maskUsers.push(charObj);
          } else {
            civilians.push(charObj);
          }
        });
        this.maskUsers = maskUsers.sort((a, b) => a.name.localeCompare(b.name));
        this.civilians = civilians.sort((a, b) => a.name.localeCompare(b.name));
        // Keep original characters for compatibility
        this.characters = [...this.maskUsers, ...this.civilians];
      },
      (error) => {
        console.error('Error fetching character names:', error);
      }
    );
  }

  fetchAllCharacters() {
    this.http.get<{ characterName: string, characterID: string }[]>(`https://${localIP}:443/all-characters`).subscribe(
      (data) => {
        this.allCharacters = data
          .map(character => ({
            name: character.characterName,
            id: character.characterID
          }))
          .sort((a, b) => a.name.localeCompare(b.name)); // Sort characters alphabetically by name
      },
      (error) => {
        console.error('Error fetching all characters:', error);
      }
    );
  }

  fetchMasks() {
    this.http.get<any[]>(`https://${localIP}:443/masks`).subscribe(
      (data) => {
        this.maskList = data.map(mask => ({
          ...mask,
          characterName: this.allCharacters.find(character => character.id === mask.maskID)?.name || 'Unknown Character'
        }));
      },
      (error) => {
        console.error('Error fetching masks:', error);
      }
    );
    
    // for each mask in masklist look at the characterInfo table and search for the maskID then save the characterName associated with the maskID and console log "CharacterName: MaskID"
    // Then display the masks in the drop down in manage mask skill by the characterName. Only use the characterName for display. The maskID should still be used for other functions.
  }

  selectCharacter(name: string) {
    this.currentlySelectedCharacter = name;
    // Clear manage mask form when selecting a new character
    this.manageMaskId = null;
    this.loadedMaskDetails = {};
    
    this.http.get<{ characterID: string, maskID: string | null }>(`https://${localIP}:443/character-id/${name}`).subscribe(
      (data) => {
        this.currentlySelectedCharacterID = data.characterID;
        this.characterCurrentMaskId = data.maskID ? parseInt(data.maskID, 10) : null; // Store the character's current mask ID
        this.fetchStatsSheet(this.currentlySelectedCharacterID);
        this.fetchFamilyMembers(this.currentlySelectedCharacterID);
        this.fetchFriendMembers(this.currentlySelectedCharacterID);
        this.fetchInventoryItems(this.currentlySelectedCharacterID);
        this.fetchSkills(this.currentlySelectedCharacterID);
        if (data.maskID) {
          this.fetchMaskDetails(data.maskID); // Fetch mask details if maskID is not null
        } else {
          this.newMask = { photo: '', passiveSkill: '', activeSkills: '', attackDamage: 0, abilityDamage: 0, magicResist: 0, protections: 0, health: 0, speed: 0 }; // Initialize newMask with default values
          this.maskDetails = {}; // Reset maskDetails
        }
      },
      (error) => {
        console.error('Error fetching character ID:', error);
      }
    );
  }

  fetchStatsSheet(characterID: string) {
    this.http.get<any>(`https://${localIP}:443/stats-sheet/${characterID}`).subscribe(
      (data) => {
        this.statsSheet = data;
      },
      (error) => {
        console.error('Error fetching stats sheet:', error);
      }
    );
  }

  fetchFamilyMembers(characterID: string) {
    this.http.get<any[]>(`https://${localIP}:443/family-member/${characterID}`).subscribe(
      (data) => {
        this.familyMembers = data.map(member => ({
          characterName: member.characterName,
          photo: member.photo ? `https://${localIP}:443${member.photo}` : ''
        }));
      },
      (error) => {
        console.error('Error fetching family members:', error);
      }
    );
  }

  fetchFriendMembers(characterID: string) {
    this.http.get<any[]>(`https://${localIP}:443/friend-member/${characterID}`).subscribe(
      (data) => {
        this.friendMembers = data.map(member => ({
          characterName: member.characterName,
          photo: member.photo ? `https://${localIP}:443${member.photo}` : ''
        }));
      },
      (error) => {
        console.error('Error fetching friend members:', error);
      }
    );
  }

  fetchInventoryItems(characterID: string) {
    this.http.get<any[]>(`https://${localIP}:443/inventory-item/${characterID}`).subscribe(
      (data) => {
        this.inventoryItems = data.map(item => ({
          ...item,
          photo: item.photo ? `https://${localIP}:443${item.photo}` : ''
        })).sort((a, b) => a.itemName.localeCompare(b.itemName)); // Sort items alphabetically by name
      },
      (error) => {
        console.error('Error fetching inventory items:', error);
      }
    );
  }

  fetchSkills(characterID: string) {
    this.http.get<any[]>(`https://${localIP}:443/skill-list/${characterID}`).subscribe(
      (data) => {
        this.skillList = data.sort((a, b) => a.skillName.localeCompare(b.skillName)); // Sort skills alphabetically by name
      },
      (error) => {
        console.error('Error fetching skills:', error);
      }
    );
  }

  fetchMaskDetails(maskID: string) {
    this.http.get<any>(`https://${localIP}:443/mask-details/${maskID}`).subscribe(
      (data) => {
        if (data && Object.keys(data).length > 0) {
          this.maskDetails = data;
          this.newMask = { 
            ...data, 
            photo: `https://${localIP}:443${data.photo}`,
            activeSkills: data.activeSkills.join(', '), // Convert array to comma-separated string
          }; // Initialize newMask with the received data and format photo URL
          this.fetchMaskSkillDetails(data.activeSkills); // Fetch mask skill details
        } else {
          this.newMask = { photo: '', passiveSkill: '', activeSkills: '', attackDamage: 0, abilityDamage: 0, magicResist: 0, protections: 0, health: 0, speed: 0 }; // Initialize newMask if no mask is found
          this.maskDetails = {}; // Reset maskDetails
        }
      },
      (error) => {
        if (error.status === 404) {
          this.newMask = { photo: '', passiveSkill: '', activeSkills: '', attackDamage: 0, abilityDamage: 0, magicResist: 0, protections: 0, health: 0, speed: 0 }; // Initialize newMask if no mask is found
          this.maskDetails = {}; // Reset maskDetails
        } else {
          console.error('Error fetching mask details:', error);
        }
      }
    );
  }

  fetchMaskSkillDetails(skillIDs: number[]) {
    skillIDs.forEach(skillID => {
      this.http.get<any>(`https://${localIP}:443/mask-skill-details/${skillID}`).subscribe(
        (data) => {
          this.maskDetails.activeSkills.push(data); // Add skill details to maskDetails
        },
        (error) => {
          console.error(`Error fetching mask skill details for skill ID ${skillID}:`, error);
        }
      );
    });
  }

  saveStatsSheet() {
    this.http.put(`https://${localIP}:443/stats-sheet/${this.currentlySelectedCharacterID}`, this.statsSheet).subscribe(
      () => {
      },
      (error) => {
        console.error('Error saving stats sheet:', error);
      }
    );
  }

  saveMaskSkill() {
    const maskSkillData = { 
      ...this.newMaskSkill,
      mainStatPercentage: parseFloat(this.newMaskSkill.mainStatPercentage),
      cooldown: parseInt(this.newMaskSkill.cooldown, 10),
      amountOfStrikes: parseInt(this.newMaskSkill.amountOfStrikes, 10),
      isMultiTarget: this.newMaskSkill.isMultiTarget // Include this property
    };
    this.http.post(`https://${localIP}:443/mask-skills`, maskSkillData).subscribe(
      (data: any) => {
        this.updateMaskActiveSkills(data.skillID);
        this.newMaskSkill = { 
          skillName: '', 
          description: '', 
          mainStat: '', 
          mainStatPercentage: 0, 
          cooldown: 0,
          amountOfStrikes: 1, // Reset to default value
          onHitEffect: 'None', // Reset to default value
          isMultiTarget: false // Reset to default value
        };
      },
      (error) => {
        console.error('Error saving mask skill:', error);
      }
    );
  }

  updateMaskActiveSkills(skillID: number) {
    if (this.currentlySelectedCharacterID !== null) {
      this.http.put(`https://${localIP}:443/masks/${this.maskDetails.maskID}/add-skill`, { skillID }).subscribe(
        () => {
          console.log('Skill added to mask successfully');
        },
        (error) => {
          console.error('Error adding skill to mask:', error);
        }
      );
    }
  }

  saveMaskMod() {
    const modData = { 
      modType: this.newMaskMod.modType, 
      modRarity: parseInt(this.newMaskMod.modRarity, 10), 
      description: this.newMaskMod.description 
    };

    this.http.post(`https://${localIP}:443/mods`, modData).subscribe(
      (mod: any) => {
        if (this.maskDetails.maskID) {
          this.addModToMask(mod.modID, this.maskDetails.maskID); // Use the maskID of the currently selected character
        }
        this.newMaskMod = { modType: '', modRarity: 0, description: '' }; // Reset new mod form
      },
      (error) => {
        console.error('Error saving mod:', error);
      }
    );
  }

  addModToMask(modID: number, maskID: number) {
    this.http.put(`https://${localIP}:443/masks/${maskID}/add-mod`, { modID }).subscribe(
      () => {
        console.log(`Mod ${modID} added to mask ${maskID}`);
      },
      (error) => {
        console.error('Error adding mod to mask:', error);
      }
    );
  }

  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  hasKeys(obj: any): boolean {
    return obj && Object.keys(obj).length > 0;
  }

  changeView(view: string) {
    this.selectedView = view;
    
    // If switching to Manage Mask view, automatically load the character's current mask
    if (view === 'Manage Mask' && this.characterCurrentMaskId) {
      this.manageMaskId = this.characterCurrentMaskId;
      this.loadMaskDetails();
    } else if (view === 'Manage Mask' && !this.characterCurrentMaskId) {
      // Clear the manage mask form if character has no mask
      this.clearMaskId();
    }
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

  addMask() {
    this.newMask = { photo: '', passiveSkill: '', activeSkills: [] };
  }

  saveInventoryItem() {
    const inventoryItemData = { 
      ...this.newInventoryItem, 
      itemName: this.newInventoryItem.itemName,
      description: this.newInventoryItem.description.replace(/\n/g, '\\n') // Replace new lines with \n
    };
    this.http.post(`https://${localIP}:443/character-info/${this.currentlySelectedCharacterID}/inventory-item`, inventoryItemData).subscribe(
      (data: any) => {
        this.inventoryItems.push(data); // Add the new item to the inventoryItems array
        this.newInventoryItem = null; // Reset the newInventoryItem
      },
      (error) => {
        console.error('Error saving inventory item:', error);
      }
    );
  }

  saveSkill() {
    const skillData = { 
      ...this.newSkill, 
      skillName: this.newSkill.skillName,
      description: this.newSkill.description.replace(/\n/g, '\\n') // Replace new lines with \n
    };
    this.http.post(`https://${localIP}:443/character-info/${this.currentlySelectedCharacterID}/skill`, skillData).subscribe(
      (data: any) => {
        this.skillList.push(data); // Add the new skill to the skillList array
        this.newSkill = null; // Reset the newSkill
      },
      (error) => {
        console.error('Error saving skill:', error);
      }
    );
  }

  createMask() {
    const maskData = { 
      ...this.newMask, 
      activeSkills: this.newMask.activeSkills.split(',').map((skill: string) => parseInt(skill.trim(), 10)), // Convert activeSkills to array of integers
      attackDamage: this.newMask.attackDamage,
      abilityDamage: this.newMask.abilityDamage,
      magicResist: this.newMask.magicResist,
      protections: this.newMask.protections,
      health: this.newMask.health,
      currentHealth: this.newMask.health, // Set currentHealth to health value
      speed: this.newMask.speed
    };

    // Check if the new /masks endpoint exists, otherwise use fallback
    this.http.post(`https://${localIP}:443/masks`, maskData).subscribe(
      (data: any) => {
        console.log('Mask created successfully:', data);
        alert(`Mask created with ID: ${data.maskID}`);
        this.newMask = { photo: '', passiveSkill: '', activeSkills: '', attackDamage: 0, abilityDamage: 0, magicResist: 0, protections: 0, health: 0, speed: 0 }; // Reset the newMask with default values
      },
      (error) => {
        console.error('Error creating mask with /masks endpoint:', error);
        
        // Fallback: Create mask by temporarily assigning to current character
        if (this.currentlySelectedCharacterID) {
          // First, store the current mask ID if any
          const originalMaskId = this.characterCurrentMaskId;
          
          this.http.post(`https://${localIP}:443/character-info/${this.currentlySelectedCharacterID}/mask`, maskData).subscribe(
            (data: any) => {
              console.log('Mask created successfully via fallback:', data);
              const newMaskId = data.maskID;
              
              // If character originally had a mask, restore it
              if (originalMaskId) {
                // Fetch the original mask data and reassign it
                this.http.get<any>(`https://${localIP}:443/mask-details/${originalMaskId}`).subscribe(
                  (originalMaskData) => {
                    const originalMaskPayload = {
                      photo: originalMaskData.photo || '',
                      passiveSkill: originalMaskData.passiveSkill || '',
                      activeSkills: originalMaskData.activeSkills || [],
                      attackDamage: originalMaskData.attackDamage || 0,
                      abilityDamage: originalMaskData.abilityDamage || 0,
                      magicResist: originalMaskData.magicResist || 0,
                      protections: originalMaskData.protections || 0,
                      health: originalMaskData.health || 0,
                      speed: originalMaskData.speed || 0
                    };
                    
                    this.http.post(`https://${localIP}:443/character-info/${this.currentlySelectedCharacterID}/mask`, originalMaskPayload).subscribe(
                      () => {
                        alert(`Mask created with ID: ${newMaskId}. Original mask restored.`);
                        this.selectCharacter(this.currentlySelectedCharacter!);
                      },
                      (restoreError) => {
                        console.error('Error restoring original mask:', restoreError);
                        alert(`Mask created with ID: ${newMaskId}, but failed to restore original mask.`);
                      }
                    );
                  }
                );
              } else {
                // Character had no original mask, remove the newly created one
                this.websocketService.removeMaskFromUser(newMaskId);
                setTimeout(() => {
                  alert(`Mask created with ID: ${newMaskId}`);
                  this.selectCharacter(this.currentlySelectedCharacter!);
                }, 500);
              }
              
              this.newMask = { photo: '', passiveSkill: '', activeSkills: '', attackDamage: 0, abilityDamage: 0, magicResist: 0, protections: 0, health: 0, speed: 0 }; // Reset the newMask with default values
            },
            (fallbackError) => {
              console.error('Error creating mask via fallback:', fallbackError);
              alert('Error creating mask. Please try again.');
            }
          );
        } else {
          alert('Please select a character first to create a mask.');
        }
      }
    );
  }

  saveFamilyMember() {
    if (this.selectedFamilyMember) {
      const selectedCharacter = this.allCharacters.find(character => character.name === this.selectedFamilyMember);
      if (selectedCharacter) {
        const familyMemberId = selectedCharacter.id;
        this.http.put(`https://${localIP}:443/character-info/${this.currentlySelectedCharacter}/family-members`, { familyMemberId }).subscribe(
          () => {
            this.fetchFamilyMembers(this.currentlySelectedCharacterID!); // Refresh family members list
            this.newFamilyMember = null; // Reset the newFamilyMember
            this.selectedFamilyMember = null; // Reset the selectedFamilyMember
          },
          (error) => {
            console.error('Error adding family member:', error);
          }
        );
      }
    }
  }

  saveFriendMember() {
    if (this.selectedFriendMember) {
      const selectedCharacter = this.allCharacters.find(character => character.name === this.selectedFriendMember);
      if (selectedCharacter) {
        const friendMemberId = selectedCharacter.id;
        this.http.put(`https://${localIP}:443/character-info/${this.currentlySelectedCharacter}/friend-members`, { friendMemberId }).subscribe(
          () => {
            this.fetchFriendMembers(this.currentlySelectedCharacterID!); // Refresh friend members list
            this.newFriendMember = null; // Reset the newFriendMember
            this.selectedFriendMember = null; // Reset the selectedFriendMember
          },
          (error) => {
            console.error('Error adding friend member:', error);
          }
        );
      }
    }
  }

  updateCharacterFamilyMembers(familyMemberId: number) {
    this.http.put(`https://${localIP}:443/character-info/${this.currentlySelectedCharacter}/family-members`, { familyMemberId }).subscribe(
      () => {
      },
      (error) => {
        console.error('Error updating character family members:', error);
      }
    );
  }

  updateCharacterFriendMembers(friendMemberId: number) {
    this.http.put(`https://${localIP}:443/character-info/${this.currentlySelectedCharacter}/friend-members`, { friendMemberId }).subscribe(
      () => {
      },
      (error) => {
        console.error('Error updating character friend members:', error);
      }
    );
  }

  updateCharacterInventoryItems(itemId: number) {
    this.http.put(`https://${localIP}:443/character-info/${this.currentlySelectedCharacter}/inventory-items`, { itemId }).subscribe(
      () => {
      },
      (error) => {
        console.error('Error updating character inventory items:', error);
      }
    );
  }

  saveImage(formData: FormData) {
    this.http.post(`https://${localIP}:443/save-image`, formData).subscribe(
      (response: any) => {
        if (this.newFamilyMember) {
          this.newFamilyMember.photo = response.filePath; // Save as relative URL
        } else if (this.newFriendMember) {
          this.newFriendMember.photo = response.filePath; // Save as relative URL
        } else if (this.newInventoryItem) {
          this.newInventoryItem.photo = response.filePath; // Save as relative URL
        } else if (this.newMask) {
          this.newMask.photo = response.filePath; // Save as relative URL
        }
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

  onImageUploadMask(event: any) {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('maskID', this.maskDetails.maskID || ''); // Use mask ID if available
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
      this.http.delete(`https://${localIP}:443/character-info/${this.currentlySelectedCharacterID}/skill/${this.selectedSkill.skillID}`).subscribe(
        () => {
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
      this.http.delete(`https://${localIP}:443/character-info/${this.currentlySelectedCharacterID}/inventory-item/${this.selectedInventoryItem.itemID}`).subscribe(
        () => {
          this.inventoryItems = this.inventoryItems.filter(item => item !== this.selectedInventoryItem);
          this.selectedInventoryItem = null;
        },
        (error) => {
          console.error('Error deleting inventory item:', error);
        }
      );
    }
  }

  removeMaskFromUser() {
    if (this.currentlySelectedCharacterID) {
      this.websocketService.removeMaskFromUser(this.maskDetails.maskID); // Use WebSocket to remove the mask
      this.newMask = { photo: '', passiveSkill: '', activeSkills: '', attackDamage: 0, abilityDamage: 0, magicResist: 0, protections: 0, health: 0, speed: 0 }; // Reset newMask
      this.maskDetails = {}; // Clear mask details
    }
  }

  // New methods for manage mask functionality
  loadMaskDetails() {
    if (!this.manageMaskId) {
      alert('Please enter a mask ID');
      return;
    }

    this.http.get<any>(`https://${localIP}:443/mask-details/${this.manageMaskId}`).subscribe(
      (data) => {
        this.loadedMaskDetails = data;
        console.log('Loaded mask details:', data);
      },
      (error) => {
        console.error('Error loading mask details:', error);
        if (error.status === 404) {
          alert('Mask not found with the provided ID');
        } else {
          alert('Error loading mask details. Please try again.');
        }
        this.loadedMaskDetails = {};
      }
    );
  }

  clearMaskId() {
    this.manageMaskId = null;
    this.loadedMaskDetails = {};
  }

  assignMaskToCharacter() {
    if (!this.manageMaskId || !this.currentlySelectedCharacterID) {
      alert('Please select a character and enter a mask ID');
      return;
    }

    // First verify the mask exists
    this.http.get<any>(`https://${localIP}:443/mask-details/${this.manageMaskId}`).subscribe(
      (maskData) => {
        // Try the direct assignment endpoint first
        this.http.put(`https://${localIP}:443/character-info/${this.currentlySelectedCharacterID}/assign-mask`, 
          { maskID: Number(this.manageMaskId) }).subscribe(
          (response) => {
            console.log('Mask assigned successfully:', response);
            alert(`Mask ${this.manageMaskId} assigned to ${this.currentlySelectedCharacter}`);
            
            // Update the character's current mask ID immediately
            this.characterCurrentMaskId = this.manageMaskId;
            
            // Refresh character data to update the UI
            this.selectCharacter(this.currentlySelectedCharacter!);
          },
          (error) => {
            console.error('Direct assignment failed, trying WebSocket approach:', error);
            
            // Fallback: Use WebSocket to assign mask
            if (this.currentlySelectedCharacterID) {
              // Send assignment through WebSocket
              this.websocketService.assignMaskToCharacter(Number(this.currentlySelectedCharacterID), Number(this.manageMaskId));
              
              // Update UI immediately (optimistic update)
              this.characterCurrentMaskId = this.manageMaskId;
              alert(`Mask ${this.manageMaskId} assigned to ${this.currentlySelectedCharacter} via WebSocket`);
              
              // Refresh character data
              setTimeout(() => {
                this.selectCharacter(this.currentlySelectedCharacter!);
              }, 500);
            }
          }
        );
      },
      (error) => {
        console.error('Error verifying mask existence:', error);
        if (error.status === 404) {
          alert('Mask not found with the provided ID');
        } else {
          alert('Error loading mask details. Please try again.');
        }
      }
    );
  }

  removeMaskFromCharacter() {
    if (!this.currentlySelectedCharacterID) {
      alert('Please select a character');
      return;
    }

    // Use websocket to remove the mask (this uses the existing websocket handler)
    if (this.characterCurrentMaskId) {
      this.websocketService.removeMaskFromUser(this.characterCurrentMaskId);
      
      alert(`Mask removed from ${this.currentlySelectedCharacter}`);
      
      // Update the character's current mask ID immediately
      this.characterCurrentMaskId = null;
      
      // Clear the manage mask form
      this.clearMaskId();
      
      // Refresh character data to update the UI
      setTimeout(() => {
        this.selectCharacter(this.currentlySelectedCharacter!);
      }, 500); // Small delay to allow websocket to complete
    } else {
      alert('Character has no mask to remove');
    }
  }
}
