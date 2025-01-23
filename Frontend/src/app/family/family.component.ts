import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http'; // Import HttpClient
import { localIP } from '../config'; // Import the IP address

interface Character {
  characterName: string;
  race: string;
  photo: string; // This will now hold file paths
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
  @Input() characterID: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    if (this.characterID) {
      this.fetchFamilyMembers(this.characterID);
    }
  }

  fetchFamilyMembers(characterID: string) {
    this.http.get<Character[]>(`https://${localIP}:8080/family-member/${characterID}`).subscribe(
      (data) => {
        this.Characters = data.map(member => ({
          characterName: member.characterName,
          race: member.race,
          photo: member.photo ? `https://${localIP}:8080${member.photo}` : ''
        }));
      },
      (error) => {
        console.error('Error fetching family members:', error);
      }
    );
  }
}
