import { useRef } from "react";

interface SpectrogramProps {
  fftSize: number;
  showFreqs: number;
  recording: boolean;
  stream: MediaStream | undefined;
}

export default function Spectrogram(props: SpectrogramProps) {
  let animationController = -1;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const source = useRef<AudioNode>();
  const analyzer = useRef<AnalyserNode>();
  const canvasPos = useRef(0);

  const generateHeatMapColors = (): Uint8ClampedArray[] => {
    const colors = new Array(256);
    for (let i = 0; i < 256; i++) {
      const ratio = i / 255;
      const red = Math.floor(255 * ratio);
      const green = Math.floor(255 * (1 - ratio));
      const blue = 128;
      colors[i] = new Uint8ClampedArray([red, green, blue, 255]); // RGBA
    }
    return colors;
  };

  const heatMap = generateHeatMapColors();

  // block executes on construction
  const renderSpectrogramLine = (
    freqIntensities: Uint8Array,
    ctx: CanvasRenderingContext2D,
    x: number,
    height: number
  ) => {
    const freqCount = freqIntensities.length;
    const imageData = ctx.createImageData(1, height);

    const step = height / freqCount;

    freqIntensities.forEach((value, index) => {
      const color = heatMap[value];
      const pos = (height - step - index * step) * 4;
      for (let i = 0; i < step; i++) {
        imageData.data.set(color, pos + i * 4);
      }
    });

    ctx.putImageData(imageData, x, 0);
  };

  const incrementSpectrogram = () => {
    if (!canvasRef.current || !analyzer.current) return;

    const stft = new Uint8Array(props.fftSize / 2);
    analyzer.current!.getByteFrequencyData(stft);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    renderSpectrogramLine(
      stft.slice(0, props.showFreqs),
      ctx,
      canvasPos.current,
      canvas.height
    );
    canvasPos.current = (canvasPos.current + 1) % canvas.width;

    // this makes the rest of the canvas darker for some reason
    /*
    if(canvasPos.current < canvas.width) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = "black";
      ctx.globalAlpha = 255;
      ctx.beginPath();
      const x = canvasPos.current;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    */

    animationController = requestAnimationFrame(incrementSpectrogram);
  };

  const audioContext = new AudioContext();
  if (props.recording) {
    if (props.stream && !source.current) {
      source.current = audioContext.createMediaStreamSource(props.stream!);
      analyzer.current = audioContext.createAnalyser();
      analyzer.current.fftSize = props.fftSize;
      source.current.connect(analyzer.current);
      if (animationController < 0) incrementSpectrogram();
    }
  } else {
    source.current = undefined;
    analyzer.current = undefined;
    cancelAnimationFrame(animationController);
    animationController = -1;
  }

  return (
    <canvas
      ref={canvasRef}
      width={786}
      height={512}
      style={{ border: "1px solid #ffffff" }}
    />
  );
}
