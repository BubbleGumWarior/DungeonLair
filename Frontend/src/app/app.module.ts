import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { BattleMapComponent } from './battle-map/battle-map.component'; // Import the new component

@NgModule({
  declarations: [
    AppComponent,
    BattleMapComponent, // Declare the new component
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
