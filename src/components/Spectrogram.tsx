import { useRef } from "react";

interface SpectrogramProps {
  fftSize: number;
  showFreqs: number;
  recording: boolean;
  stream: MediaStream | undefined;
}

export default function Spectrogram(props: SpectrogramProps) {
  const animationController = useRef(-1);
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

    const nextPos = (canvasPos.current + 1) % canvas.width;

    // this makes the rest of the canvas darker for some reason
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(nextPos, 0);
    ctx.lineTo(nextPos, canvas.height);
    ctx.stroke();

    renderSpectrogramLine(
      stft.slice(0, props.showFreqs),
      ctx,
      canvasPos.current,
      canvas.height
    );

    canvasPos.current = nextPos;
    animationController.current = requestAnimationFrame(incrementSpectrogram);
  };

  if (props.recording) {
    const audioContext = new AudioContext();
    if (props.stream) {
      if (!source.current) {
        source.current = audioContext.createMediaStreamSource(props.stream!);
        analyzer.current = audioContext.createAnalyser();
        analyzer.current.fftSize = props.fftSize;
        source.current.connect(analyzer.current);
      }
      // we re-start the animation forcibly since even if just the fftShow parameter
      // has been changed the closure needs to be made again to pick up the update
      console.log(`cancelling ${animationController.current}`);
      cancelAnimationFrame(animationController.current);
      animationController.current = requestAnimationFrame(incrementSpectrogram);
    }
  } else {
    source.current = undefined;
    analyzer.current = undefined;
    cancelAnimationFrame(animationController.current);
  }

  return (
    <canvas
      ref={canvasRef}
      width={786}
      height={256}
      style={{ border: "1px solid #ffffff" }}
    />
  );
}
