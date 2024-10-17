import { Component, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-soundbar',
  standalone: true,
  templateUrl: './soundbar.component.html',
  styleUrls: ['./soundbar.component.css'],
})
export class SoundbarComponent {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  audioContext!: AudioContext;
  analyser!: AnalyserNode;
  dataArray!: Uint8Array;

  constructor() {
    // Bind the user gesture event handler to 'this'
    this.startAudioContext = this.startAudioContext.bind(this);
    this.animate = this.animate.bind(this); // Bind animate here
  }

  ngAfterViewInit() {
    // Now this.canvasRef is guaranteed to be initialized
    this.canvasRef.nativeElement.width = window.innerWidth * 0.9;
    this.canvasRef.nativeElement.height = 100;

    // Add a click event listener to start the audio context
    document.addEventListener('click', this.startAudioContext);
  }

  startAudioContext() {
    // Remove the event listener after starting the audio context
    document.removeEventListener('click', this.startAudioContext);

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {

        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        source.connect(this.analyser);

        this.analyser.fftSize = 256;
        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);

        // Call animate using the bound method
        this.animate();
      })
      .catch(err => {
        console.error('Error accessing microphone', err);
      });
  }

  animate() {
    const canvas = this.canvasRef.nativeElement;
    const canvasContext = canvas.getContext('2d');
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    const draw = () => {
      requestAnimationFrame(draw);
      this.analyser.getByteFrequencyData(this.dataArray);

      canvasContext!.clearRect(0, 0, WIDTH, HEIGHT);

      const barWidth = (WIDTH / this.dataArray.length);
      let barHeight: number;
      let x = WIDTH / 2;

      // Draw bars to the right of the center
      for (let i = 0; i < this.dataArray.length; i++) {
        barHeight = this.dataArray[i] / 2;

        canvasContext!.fillStyle = 'rgb(147, 51, 234)'; // Set to #9333ea
        canvasContext!.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);

        x += barWidth;
      }

      // Draw mirrored bars to the left of the center
      x = WIDTH / 2 - barWidth;
      for (let i = 0; i < this.dataArray.length; i++) {
        barHeight = this.dataArray[i] / 2;

        canvasContext!.fillStyle = 'rgb(147, 51, 234)'; // Set to #9333ea
        canvasContext!.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);

        x -= barWidth;
      }
    };

    draw();
  }
}
