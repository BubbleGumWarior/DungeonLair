import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { localIP } from '../config'; // Import the IP address
import DOMPurify from 'dompurify'; // Import DOMPurify

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
  @Input() username: string | null = null; // Change Input property to username
  notes: Note[] = [];
  nextId: number = 1;
  showAddNoteModal: boolean = false;
  showNoteModal: boolean = false; // Add property to track note modal visibility
  newNoteName: string = '';
  selectedNote: Note | null = null; // Add property to track selected note

  constructor() {}

  ngOnInit() {
    if (this.username) {
      this.loadNotes();
    }
  }

  async loadNotes() {
    try {
      const response = await fetch(`https://${localIP}:8080/get-notes/${this.username}`);
      const notes = await response.json();
      this.notes = notes.map((note: { noteID: number; title: string; description: string }) => ({
        id: note.noteID,
        name: DOMPurify.sanitize(note.title),
        description: DOMPurify.sanitize(note.description)
      }));
      this.nextId = this.notes.length > 0 ? Math.max(...this.notes.map(note => note.id)) + 1 : 1;
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  }

  async addNote() {
    if (this.username) {
      const newNote = { title: DOMPurify.sanitize(this.newNoteName), description: '' };
      try {
        const response = await fetch(`https://${localIP}:8080/add-note/${this.username}`, {
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
        this.notes.push({ id: note.id, name: DOMPurify.sanitize(note.title), description: DOMPurify.sanitize(note.description) });
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
    if (this.selectedNote && this.username) {
      const updatedNote = { title: DOMPurify.sanitize(this.selectedNote.name), description: DOMPurify.sanitize(this.selectedNote.description) };
      try {
        const response = await fetch(`https://${localIP}:8080/update-note/${this.username}/${this.selectedNote.id}`, {
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
    if (this.selectedNote && this.username) {
      try {
        const response = await fetch(`https://${localIP}:8080/delete-note/${this.username}/${this.selectedNote.id}`, {
          method: 'DELETE'
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText);
        }
        this.notes = this.notes.filter(note => note.id !== this.selectedNote!.id);
        this.closeNoteModal();
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  }
}
