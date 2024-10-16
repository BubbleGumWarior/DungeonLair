import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VCButtonComponent } from './vcbutton.component';

describe('VCButtonComponent', () => {
  let component: VCButtonComponent;
  let fixture: ComponentFixture<VCButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VCButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VCButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
