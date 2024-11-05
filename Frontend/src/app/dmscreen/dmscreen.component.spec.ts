import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DMScreenComponent } from './dmscreen.component';

describe('DMScreenComponent', () => {
  let component: DMScreenComponent;
  let fixture: ComponentFixture<DMScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DMScreenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DMScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
