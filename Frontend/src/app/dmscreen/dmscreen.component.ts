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
}
