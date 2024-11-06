import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { localIP } from '../config'; // Import the IP address

interface Note {
  id: number;
  name: string;
  description: string;
}

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, FormsModule], // Add FormsModule to imports
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.css']
})
export class NotesComponent implements OnInit {
  @Input() characterName: string | null = null; // Change Input property to characterName
  items: Note[] = [];
  nextId: number = 1;
  showAddNoteModal: boolean = false;
  showNoteModal: boolean = false; // Add property to track note modal visibility
  newNoteName: string = '';
  selectedNote: Note | null = null; // Add property to track selected note

  constructor() {}

  ngOnInit() {
    if (this.characterName) {
      this.loadNotes();
    }
  }

  async loadNotes() {
    try {
      const response = await fetch(`https://${localIP}:8080/character-info/${this.characterName}/notes`);
      const notes = await response.json();
      this.items = notes.map((note: { id: number; title: string; description: string }) => ({
        id: note.id,
        name: note.title,
        description: note.description
      }));
      this.nextId = this.items.length > 0 ? Math.max(...this.items.map(item => item.id)) + 1 : 1;
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  }

  async addItem() {
    if (this.characterName) {
      const newNote = { title: this.newNoteName, description: '' };
      try {
        const response = await fetch(`https://${localIP}:8080/character-info/${this.characterName}/note`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newNote)
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText);
        }
        const note = await response.json();
        this.items.push({ id: note.id, name: note.title, description: note.description });
        this.newNoteName = '';
        this.showAddNoteModal = false;
      } catch (error) {
        console.error('Error adding note:', error);
      }
    }
  }

  openNoteModal(note: Note) {
    this.selectedNote = note;
    this.showNoteModal = true;
  }

  async closeNoteModal() {
    if (this.selectedNote && this.characterName) {
      const updatedNote = { title: this.selectedNote.name, description: this.selectedNote.description };
      try {
        const response = await fetch(`https://${localIP}:8080/character-info/${this.characterName}/note/${this.selectedNote.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedNote)
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText);
        }
        this.selectedNote = null;
        this.showNoteModal = false;
      } catch (error) {
        console.error('Error updating note:', error);
      }
    } else {
      this.selectedNote = null;
      this.showNoteModal = false;
    }
  }

  async deleteNote() {
    if (this.selectedNote && this.characterName) {
      try {
        const response = await fetch(`https://${localIP}:8080/character-info/${this.characterName}/note/${this.selectedNote.id}`, {
          method: 'DELETE'
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText);
        }
        this.items = this.items.filter(item => item.id !== this.selectedNote!.id);
        this.closeNoteModal();
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  }
}
