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
  // Main Navigation Properties
  selectedMainView: string = 'characters'; // Main navigation: 'characters', 'masks', 'skills', 'inventory'
  selectedCharacterView: string = 'stats'; // Character sub-nav: 'stats', 'family', 'friends', 'inventory', 'skills', 'mask-assignment'
  selectedMaskView: string = 'browse'; // Mask sub-nav: 'browse', 'create', 'skills', 'mods'
  
  // Form state properties
  showNewMaskSkillForm: boolean = false;
  showNewMaskModForm: boolean = false;
  editingMask: any = null;
  
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
  maskMods: any[] = []; // Store mods for the currently editing mask
  editingMod: any = null; // Store the mod being edited
  hoveredMod: any = null; // Store the hovered mod for tooltip display
  
  // Mod type selection properties
  isStatMod: boolean = false; // Toggle between Skill Mod (false) and Stat Mod (true)
  selectedStatType: string = ''; // Selected stat type for stat mods
  
  // Stat mod templates
  rarityNames: { [key: number]: string } = {
    1: 'Bronze',
    2: 'Silver', 
    3: 'Gold',
    4: 'Diamond',
    5: 'Prismatic'
  };
  
  statTypes: string[] = [
    'Attack Damage',
    'Ability Damage', 
    'Protections',
    'Magic Resist',
    'Health',
    'Speed'
  ];
  
  statBonusValues: { [key: string]: { [key: number]: number } } = {
    'Attack Damage': { 1: 50, 2: 200, 3: 400, 4: 650, 5: 950 },
    'Ability Damage': { 1: 50, 2: 200, 3: 400, 4: 650, 5: 950 },
    'Protections': { 1: 50, 2: 200, 3: 400, 4: 650, 5: 950 },
    'Magic Resist': { 1: 50, 2: 200, 3: 400, 4: 650, 5: 950 },
    'Health': { 1: 500, 2: 5000, 3: 10000, 4: 25000, 5: 50000 },
    'Speed': { 1: 5, 2: 15, 3: 25, 4: 35, 5: 50 }
  };

  maskUsers: { name: string, photo: string }[] = [];
  civilians: { name: string, photo: string }[] = [];

  // New properties for manage mask functionality
  manageMaskId: number | null = null;
  loadedMaskDetails: any = {};
  characterCurrentMaskId: number | null = null; // Store the character's current mask ID
  localIP = localIP; // Make localIP accessible in template

  // Global management properties
  allSkills: any[] = []; // Store all skills from database
  allItems: any[] = []; // Store all items from database

  constructor(private http: HttpClient, private websocketService: WebSocketService) {} // Inject WebSocketService

  ngOnInit() {
    this.fetchCharacterNames();
    this.fetchAllCharacters(); // Fetch all characters on initialization
    this.fetchMasks(); // Fetch all masks on initialization
    this.fetchAllSkills(); // Fetch all skills on initialization
    this.fetchAllItems(); // Fetch all items on initialization
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
        })).sort((a, b) => a.maskID - b.maskID); // Sort by mask ID
      },
      (error) => {
        console.error('Error fetching masks:', error);
      }
    );
    
    // for each mask in masklist look at the characterInfo table and search for the maskID then save the characterName associated with the maskID and console log "CharacterName: MaskID"
    // Then display the masks in the drop down in manage mask skill by the characterName. Only use the characterName for display. The maskID should still be used for other functions.
  }

  fetchAllSkills() {
    this.http.get<any[]>(`https://${localIP}:443/all-skills`).subscribe(
      (data) => {
        this.allSkills = data.sort((a, b) => a.skillName.localeCompare(b.skillName)); // Sort skills alphabetically by name
        console.log('Loaded', this.allSkills.length, 'global skills');
      },
      (error) => {
        console.error('Error fetching all skills:', error);
        // Fallback to empty array if endpoint doesn't exist
        this.allSkills = [];
      }
    );
  }

  fetchAllItems() {
    this.http.get<any[]>(`https://${localIP}:443/all-items`).subscribe(
      (data) => {
        this.allItems = data.map(item => ({
          ...item,
          photo: item.photo ? `https://${localIP}:443${item.photo}` : ''
        })).sort((a, b) => a.itemName.localeCompare(b.itemName)); // Sort items alphabetically by name
        console.log('Loaded', this.allItems.length, 'global items');
      },
      (error) => {
        console.error('Error fetching all items:', error);
        // Fallback to empty array if endpoint doesn't exist
        this.allItems = [];
      }
    );
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
          ...member, // Preserve all original properties including IDs
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
          ...member, // Preserve all original properties including IDs
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
        // If we're editing a mask, add the skill to that mask
        if (this.editingMask && this.editingMask.maskID) {
          this.updateMaskActiveSkillsForEdit(data.skillID, this.editingMask.maskID);
        } else {
          // Original behavior for when not editing
          this.updateMaskActiveSkills(data.skillID);
        }
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
        this.showNewMaskSkillForm = false; // Hide the form after saving
      },
      (error) => {
        console.error('Error saving mask skill:', error);
      }
    );
  }

  updateMaskActiveSkillsForEdit(skillID: number, maskID: number) {
    this.http.put(`https://${localIP}:443/masks/${maskID}/add-skill`, { skillID }).subscribe(
      () => {
        console.log(`Skill ${skillID} added to mask ${maskID} successfully`);
        // Update the local editingMask object to reflect the new skill
        if (this.editingMask.activeSkills) {
          if (Array.isArray(this.editingMask.activeSkills)) {
            this.editingMask.activeSkills.push(skillID);
          } else {
            // If it's a string, convert to array and add the new skill
            const currentSkills = this.editingMask.activeSkills.split(',').map((s: string) => parseInt(s.trim())).filter((s: number) => !isNaN(s));
            currentSkills.push(skillID);
            this.editingMask.activeSkills = currentSkills;
          }
        } else {
          this.editingMask.activeSkills = [skillID];
        }
        // Update the form display
        this.newMask.activeSkills = Array.isArray(this.editingMask.activeSkills) 
          ? this.editingMask.activeSkills.join(', ') 
          : this.editingMask.activeSkills;
      },
      (error) => {
        console.error('Error adding skill to mask:', error);
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
    // Check if we're editing an existing mod or creating a new one
    if (this.editingMod && this.editingMod.modID) {
      this.saveEditedMod();
      return;
    }

    // Create new mod
    const modData = { 
      modType: this.newMaskMod.modType, 
      modRarity: parseInt(this.newMaskMod.modRarity, 10), 
      description: this.newMaskMod.description,
      modCategory: this.isStatMod ? 'stat' : 'skill',
      statType: this.isStatMod ? this.selectedStatType : null
    };

    this.http.post(`https://${localIP}:443/mods`, modData).subscribe(
      (mod: any) => {
        // If we're editing a mask, add the mod to that mask
        if (this.editingMask && this.editingMask.maskID) {
          this.addModToMaskForEdit(mod.modID, this.editingMask.maskID);
          // Refresh the mods list
          setTimeout(() => {
            this.fetchModsForMask(this.editingMask.maskID);
          }, 500);
        } else if (this.maskDetails.maskID) {
          // Original behavior for when not editing
          this.addModToMask(mod.modID, this.maskDetails.maskID);
        }
        this.newMaskMod = { modType: '', modRarity: 0, description: '' }; // Reset new mod form
        this.selectedStatType = ''; // Reset stat type selection
        this.showNewMaskModForm = false; // Hide the form after saving
      },
      (error) => {
        console.error('Error saving mod:', error);
      }
    );
  }

  addModToMaskForEdit(modID: number, maskID: number) {
    this.http.put(`https://${localIP}:443/masks/${maskID}/add-mod`, { modID }).subscribe(
      () => {
        console.log(`Mod ${modID} added to mask ${maskID} successfully`);
        // Refresh mask details to show updated stats
        this.fetchMaskDetails(maskID.toString());
      },
      (error) => {
        console.error('Error adding mod to mask:', error);
      }
    );
  }

  fetchModsForMask(maskID: number) {
    this.http.get<any[]>(`https://${localIP}:443/masks/${maskID}/mods`).subscribe(
      (data) => {
        this.maskMods = data;
        console.log('Mods fetched for mask:', this.maskMods);
      },
      (error) => {
        console.error('Error fetching mods for mask:', error);
        this.maskMods = [];
      }
    );
  }

  removeModFromMask(modID: number, maskID: number) {
    if (confirm('Are you sure you want to remove this mod from the mask?')) {
      this.http.put(`https://${localIP}:443/masks/${maskID}/remove-mod`, { modID }).subscribe(
        response => {
          console.log(`Mod ${modID} removed from mask ${maskID} successfully`, response);
          this.fetchModsForMask(maskID);
          this.fetchMasks(); // Refresh the main collection to show updated stats
          // Refresh mask details to show updated stats
          this.fetchMaskDetails(maskID.toString());
        },
        error => {
          console.error('Error removing mod from mask:', error);
        }
      );
    }
  }

  generateStatMod(rarity: number, statType: string): { modType: string, description: string } {
    const rarityName = this.rarityNames[rarity];
    const bonusValue = this.statBonusValues[statType][rarity];
    
    return {
      modType: `${rarityName} ${statType} Mod`,
      description: `${statType} increased by ${bonusValue}.`
    };
  }

  onModTypeToggle() {
    // Reset form when switching between mod types
    if (this.isStatMod) {
      this.newMaskMod = { modType: '', modRarity: 1, description: '' };
      this.selectedStatType = '';
    } else {
      this.newMaskMod = { modType: '', modRarity: 0, description: '' };
      this.selectedStatType = '';
    }
  }

  onStatModSelectionChange() {
    if (this.isStatMod && this.selectedStatType && this.newMaskMod.modRarity) {
      const generatedMod = this.generateStatMod(this.newMaskMod.modRarity, this.selectedStatType);
      this.newMaskMod.modType = generatedMod.modType;
      this.newMaskMod.description = generatedMod.description;
    }
  }

  editMod(mod: any) {
    this.editingMod = { ...mod };
    this.newMaskMod = { ...mod };
    this.showNewMaskModForm = true;
  }

  saveEditedMod() {
    if (this.editingMod && this.editingMod.modID) {
      const modData = {
        modType: this.newMaskMod.modType,
        modRarity: parseInt(this.newMaskMod.modRarity, 10),
        description: this.newMaskMod.description
      };

      this.http.put(`https://${localIP}:443/mods/${this.editingMod.modID}`, modData).subscribe(
        () => {
          console.log(`Mod ${this.editingMod.modID} updated successfully`);
          this.newMaskMod = { modType: '', modRarity: 0, description: '' };
          this.editingMod = null;
          this.showNewMaskModForm = false;
          // Refresh the mods list if we're editing a mask
          if (this.editingMask && this.editingMask.maskID) {
            this.fetchModsForMask(this.editingMask.maskID);
          }
        },
        (error) => {
          console.error('Error updating mod:', error);
        }
      );
    }
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
    // Handle activeSkills conversion - it could be a string, array, or other type
    let activeSkillsArray: number[] = [];
    if (typeof this.newMask.activeSkills === 'string') {
      activeSkillsArray = this.newMask.activeSkills
        .split(',')
        .map((skill: string) => parseInt(skill.trim(), 10))
        .filter((skill: number) => !isNaN(skill)); // Filter out invalid numbers
    } else if (Array.isArray(this.newMask.activeSkills)) {
      activeSkillsArray = this.newMask.activeSkills.map((skill: any) => 
        typeof skill === 'number' ? skill : parseInt(skill, 10)
      ).filter((skill: number) => !isNaN(skill));
    }

    const maskData = { 
      ...this.newMask, 
      activeSkills: activeSkillsArray,
      attackDamage: this.newMask.attackDamage,
      abilityDamage: this.newMask.abilityDamage,
      magicResist: this.newMask.magicResist,
      protections: this.newMask.protections,
      health: this.newMask.health,
      currentHealth: this.newMask.health, // Set currentHealth to health value
      speed: this.newMask.speed
    };

    // Check if we're editing an existing mask or creating a new one
    if (this.editingMask && this.editingMask.maskID) {
      // Update existing mask
      this.http.put(`https://${localIP}:443/masks/${this.editingMask.maskID}`, maskData).subscribe(
        (data: any) => {
          console.log('Mask updated successfully:', data);
          this.resetMaskForm();
          this.selectedMaskView = 'browse';
          this.fetchMasks(); // Refresh mask list
        },
        (error) => {
          console.error('Error updating mask:', error);
          if (error.status === 404) {
            alert('Mask not found. It may have been deleted.');
          } else {
            alert('Error updating mask. Please try again.');
          }
        }
      );
    } else {
      // Create new mask
      this.http.post(`https://${localIP}:443/masks`, maskData).subscribe(
        (data: any) => {
          console.log('Mask created successfully:', data);
          alert(`Mask created with ID: ${data.maskID}`);
          this.resetMaskForm();
          this.fetchMasks(); // Refresh mask list
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
                
                this.resetMaskForm();
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

  deleteSkill(skillToDelete?: any) {
    const skill = skillToDelete || this.selectedSkill;
    if (skill) {
      this.http.delete(`https://${localIP}:443/character-info/${this.currentlySelectedCharacterID}/skill/${skill.skillID}`).subscribe(
        () => {
          this.skillList = this.skillList.filter(s => s !== skill);
          if (this.selectedSkill === skill) {
            this.selectedSkill = null;
          }
        },
        (error) => {
          console.error('Error deleting skill:', error);
        }
      );
    }
  }

  deleteInventoryItem(itemToDelete?: any) {
    const item = itemToDelete || this.selectedInventoryItem;
    if (item) {
      this.http.delete(`https://${localIP}:443/character-info/${this.currentlySelectedCharacterID}/inventory-item/${item.itemID}`).subscribe(
        () => {
          this.inventoryItems = this.inventoryItems.filter(i => i !== item);
          if (this.selectedInventoryItem === item) {
            this.selectedInventoryItem = null;
          }
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

  // Navigation Methods
  selectMainView(view: string) {
    this.selectedMainView = view;
  }

  selectCharacterView(view: string) {
    this.selectedCharacterView = view;
  }

  selectMaskView(view: string) {
    this.selectedMaskView = view;
  }

  // Cancel methods for forms
  cancelAddingFamily() {
    this.newFamilyMember = null;
  }

  cancelAddingFriend() {
    this.newFriendMember = null;
  }

  cancelAddingInventory() {
    this.newInventoryItem = null;
  }

  cancelAddingSkill() {
    this.newSkill = null;
  }

  cancelEditingStats() {
    if (this.currentlySelectedCharacterID) {
      this.fetchStatsSheet(this.currentlySelectedCharacterID);
    }
  }

  cancelMaskCreation() {
    this.newMask = { 
      photo: '', 
      passiveSkill: '', 
      activeSkills: '', 
      attackDamage: 0, 
      abilityDamage: 0, 
      magicResist: 0,
      protections: 0, 
      health: 0, 
      speed: 0 
    };
  }

  // Family/Friends management
  selectFamilyMember(member: any) {
    this.selectedFamilyMember = member.characterID || member.id;
  }

  selectFriendMember(member: any) {
    this.selectedFriendMember = member.characterID || member.id;
  }

  // Skill management
  selectSkillItem(skill: any) {
    this.selectedSkill = skill;
  }

  // Missing methods for family management
  deleteFamilyMember(index: number) {
    if (this.familyMembers && this.familyMembers[index]) {
      const member = this.familyMembers[index];
      console.log('Deleting family member:', member); // Debug log
      
      // Try to find the correct ID property - common variations
      const memberId = member.familyID || member.id || member.characterID || member.familyMemberID;
      
      if (!memberId) {
        console.error('No valid ID found for family member:', member);
        alert('Cannot delete family member: missing ID');
        return;
      }
      
      this.http.delete(`https://${localIP}:443/character-info/${this.currentlySelectedCharacterID}/family/${memberId}`).subscribe(
        () => {
          this.familyMembers.splice(index, 1);
        },
        (error) => {
          console.error('Error deleting family member:', error);
        }
      );
    }
  }

  cancelFamilyMember() {
    this.newFamilyMember = null;
  }

  // Missing methods for friend management
  deleteFriendMember(index: number) {
    if (this.friendMembers && this.friendMembers[index]) {
      const member = this.friendMembers[index];
      console.log('Deleting friend member:', member); // Debug log
      
      // Try to find the correct ID property - common variations
      const memberId = member.friendID || member.id || member.characterID || member.friendMemberID;
      
      if (!memberId) {
        console.error('No valid ID found for friend member:', member);
        alert('Cannot delete friend member: missing ID');
        return;
      }
      
      this.http.delete(`https://${localIP}:443/character-info/${this.currentlySelectedCharacterID}/friend/${memberId}`).subscribe(
        () => {
          this.friendMembers.splice(index, 1);
        },
        (error) => {
          console.error('Error deleting friend member:', error);
        }
      );
    }
  }

  cancelFriendMember() {
    this.newFriendMember = null;
  }

  // Missing methods for inventory management
  cancelInventoryItem() {
    this.newInventoryItem = null;
  }

  // Missing methods for skill management
  cancelSkill() {
    this.newSkill = null;
  }

  // Missing methods for mask management
  resetMaskForm() {
    this.newMask = { 
      photo: '', 
      passiveSkill: '', 
      activeSkills: '', 
      attackDamage: 0, 
      abilityDamage: 0, 
      magicResist: 0,
      protections: 0, 
      health: 0, 
      speed: 0 
    };
    this.editingMask = null;
  }

  editMask(mask: any) {
    this.editingMask = mask;
    // Copy mask data to edit form, ensuring activeSkills is a string
    this.newMask = { 
      ...mask,
      activeSkills: Array.isArray(mask.activeSkills) 
        ? mask.activeSkills.join(', ') 
        : (mask.activeSkills || '').toString()
    };
    this.selectedMaskView = 'create';
    
    // Fetch mods for this mask
    this.fetchModsForMask(mask.maskID);
  }

  deleteMask(maskId: number) {
    if (confirm(`Are you sure you want to delete mask ${maskId}? This action cannot be undone.`)) {
      this.http.delete(`https://${localIP}:443/masks/${maskId}`).subscribe(
        (response: any) => {
          console.log('Mask deleted successfully:', response);
          this.fetchMasks(); // Refresh mask list
        },
        (error) => {
          console.error('Error deleting mask:', error);
          if (error.status === 400) {
            alert(error.error.error || 'Cannot delete mask because it is currently assigned to a character.');
          } else if (error.status === 404) {
            alert('Mask not found. It may have already been deleted.');
          } else {
            alert('Error deleting mask. Please try again.');
          }
        }
      );
    }
  }

  removeMaskImage() {
    this.newMask.photo = '';
  }

  cancelMaskEdit() {
    this.resetMaskForm();
    this.selectedMaskView = 'browse';
    // Also hide any open skill/mod forms when canceling mask edit
    this.showNewMaskSkillForm = false;
    this.showNewMaskModForm = false;
  }

  // Missing methods for mask skill management
  cancelMaskSkill() {
    this.newMaskSkill = { 
      skillName: '', 
      description: '', 
      mainStat: '', 
      mainStatPercentage: 0, 
      cooldown: 0,
      amountOfStrikes: 1,
      onHitEffect: 'None',
      isMultiTarget: false
    };
    this.showNewMaskSkillForm = false;
  }

  // Missing methods for mask mod management
  cancelMaskMod() {
    this.newMaskMod = { modType: '', modRarity: 0, description: '' };
    this.editingMod = null; // Reset editing state
    this.isStatMod = false; // Reset to skill mod
    this.selectedStatType = ''; // Reset stat type selection
    this.showNewMaskModForm = false;
  }

  // Missing methods for global management
  addGlobalSkill() {
    this.newSkill = { skillName: '', mainStat: '', description: '', diceRoll: '' };
  }

  addGlobalItem() {
    this.newInventoryItem = { itemName: '', type: '', mainStat: '', description: '', damage: '', photo: '' };
  }

  saveGlobalSkill() {
    const skillData = { 
      ...this.newSkill, 
      skillName: this.newSkill.skillName,
      description: this.newSkill.description.replace(/\n/g, '\\n') // Replace new lines with \n
    };
    this.http.post(`https://${localIP}:443/skills`, skillData).subscribe(
      (data: any) => {
        this.allSkills.push(data); // Add the new skill to the allSkills array
        this.allSkills.sort((a, b) => a.skillName.localeCompare(b.skillName)); // Re-sort
        this.newSkill = null; // Reset the newSkill
      },
      (error) => {
        console.error('Error saving global skill:', error);
      }
    );
  }

  saveGlobalItem() {
    const inventoryItemData = { 
      ...this.newInventoryItem, 
      itemName: this.newInventoryItem.itemName,
      description: this.newInventoryItem.description.replace(/\n/g, '\\n') // Replace new lines with \n
    };
    this.http.post(`https://${localIP}:443/items`, inventoryItemData).subscribe(
      (data: any) => {
        this.allItems.push({
          ...data,
          photo: data.photo ? `https://${localIP}:443${data.photo}` : ''
        }); // Add the new item to the allItems array
        this.allItems.sort((a, b) => a.itemName.localeCompare(b.itemName)); // Re-sort
        this.newInventoryItem = null; // Reset the newInventoryItem
      },
      (error) => {
        console.error('Error saving global item:', error);
      }
    );
  }

  deleteGlobalSkill(skill: any) {
    if (confirm(`Are you sure you want to delete skill "${skill.skillName}"? This action cannot be undone.`)) {
      this.http.delete(`https://${localIP}:443/skills/${skill.skillID}`).subscribe(
        () => {
          this.allSkills = this.allSkills.filter(s => s !== skill);
        },
        (error) => {
          console.error('Error deleting global skill:', error);
        }
      );
    }
  }

  deleteGlobalItem(item: any) {
    if (confirm(`Are you sure you want to delete item "${item.itemName}"? This action cannot be undone.`)) {
      this.http.delete(`https://${localIP}:443/items/${item.itemID}`).subscribe(
        () => {
          this.allItems = this.allItems.filter(i => i !== item);
        },
        (error) => {
          console.error('Error deleting global item:', error);
        }
      );
    }
  }

  cancelGlobalSkill() {
    this.newSkill = null;
  }

  cancelGlobalItem() {
    this.newInventoryItem = null;
  }

  formatPassiveSkillText(text: string): string {
    if (!text) {
      return 'N/A';
    }
    // Convert newlines to <br> tags to preserve line breaks
    return text.replace(/\n/g, '<br>');
  }
}
