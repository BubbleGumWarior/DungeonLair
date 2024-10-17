import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SoundbarComponent } from './soundbar.component';

describe('SoundbarComponent', () => {
  let component: SoundbarComponent;
  let fixture: ComponentFixture<SoundbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SoundbarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SoundbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
