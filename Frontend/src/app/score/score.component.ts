import { Component, Input, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { localIP } from '../config'; // Import localIP from config

@Component({
  selector: 'app-score',
  standalone: true,
  imports: [CommonModule], // Add CommonModule to imports
  templateUrl: './score.component.html',
  styleUrl: './score.component.css'
})
export class ScoreComponent implements OnInit {
  @Input() characterName: string = ''; // Add characterName input
  @Input() role: string = ''; // Add role input
  scores: any[] = []; // Add property to store scores

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchScores();
  }

  async fetchScores() {
    try {
      const response = await fetch(`https://${localIP}:8080/api/scores`);
      this.scores = await response.json();
    } catch (error) {
      console.error('Error fetching scores:', error);
    }
  }

  async updateScore(characterName: string, field: string, value: number) {
    try {
      await this.http.put(`https://${localIP}:8080/api/scores/${characterName}`, { field, value }).toPromise();
      this.fetchScores(); // Refresh scores after update
    } catch (error) {
      console.error('Error updating score:', error);
    }
  }

  incrementScore(characterName: string, field: string) {
    const score = this.scores.find(s => s.characterName === characterName);
    if (score) {
      this.updateScore(characterName, field, score[field] + 1);
    }
  }

  decrementScore(characterName: string, field: string) {
    const score = this.scores.find(s => s.characterName === characterName);
    if (score) {
      this.updateScore(characterName, field, score[field] - 1);
    }
  }
}
