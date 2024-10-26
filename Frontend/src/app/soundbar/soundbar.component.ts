import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';

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
    this.startAudioContext = this.startAudioContext.bind(this);
    this.animate = this.animate.bind(this);
  }

  ngAfterViewInit() {
    // Set canvas width to full width and height to 100px
    this.resizeCanvas();
    document.addEventListener('click', this.startAudioContext);
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.resizeCanvas();
  }

  resizeCanvas() {
    this.canvasRef.nativeElement.width = window.innerWidth;
    this.canvasRef.nativeElement.height = 100;
  }

  startAudioContext() {
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

        this.animate();
      })
      .catch(err => {
        console.error('Error accessing microphone', err);
      });
  }

  animate() {
    const canvas = this.canvasRef.nativeElement;
    const canvasContext = canvas.getContext('2d');
    const HEIGHT = canvas.height;

    const draw = () => {
      requestAnimationFrame(draw);
      this.analyser.getByteFrequencyData(this.dataArray);

      canvasContext!.clearRect(0, 0, canvas.width, HEIGHT);

      const barWidth = canvas.width / this.dataArray.length;
      let barHeight: number;
      let x = canvas.width / 2;

      // Draw bars to the right of the center
      for (let i = 0; i < this.dataArray.length; i++) {
        barHeight = this.dataArray[i] / 2;

        canvasContext!.fillStyle = 'rgb(147, 51, 234)';
        canvasContext!.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);

        x += barWidth;
      }

      // Draw mirrored bars to the left of the center
      x = canvas.width / 2 - barWidth;
      for (let i = 0; i < this.dataArray.length; i++) {
        barHeight = this.dataArray[i] / 2;

        canvasContext!.fillStyle = 'rgb(147, 51, 234)';
        canvasContext!.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);

        x -= barWidth;
      }
    };

    draw();
  }
}
