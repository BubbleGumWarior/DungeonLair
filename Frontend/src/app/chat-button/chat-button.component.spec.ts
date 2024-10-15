import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatButtonComponent } from './chat-button.component';

describe('ChatButtonComponent', () => {
  let component: ChatButtonComponent;
  let fixture: ComponentFixture<ChatButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
