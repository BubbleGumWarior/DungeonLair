import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { FormsModule } from '@angular/forms'; // Import FormsModule

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, FormsModule], // Add FormsModule to imports
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.css']
})
export class NotesComponent {
  items: { id: number, name: string, description: string }[] = [];
  nextId: number = 1;
  showAddNoteModal: boolean = false;
  showNoteModal: boolean = false; // Add property to track note modal visibility
  newNoteName: string = '';
  selectedNote: { id: number, name: string, description: string } | null = null; // Add property to track selected note

  addItem() {
    this.items.push({ id: this.nextId++, name: this.newNoteName, description: '' });
    this.newNoteName = '';
    this.showAddNoteModal = false;
  }

  openNoteModal(note: { id: number, name: string, description: string }) {
    this.selectedNote = note;
    this.showNoteModal = true;
  }

  closeNoteModal() {
    this.selectedNote = null;
    this.showNoteModal = false;
  }

  deleteNote() {
    if (this.selectedNote) {
      this.items = this.items.filter(item => item.id !== this.selectedNote!.id);
      this.closeNoteModal();
    }
  }
}
