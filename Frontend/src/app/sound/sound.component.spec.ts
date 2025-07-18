import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SoundComponent } from './sound.component';

describe('VCButtonComponent', () => {
  let component: SoundComponent;
  let fixture: ComponentFixture<SoundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SoundComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
