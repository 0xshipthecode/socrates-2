import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

interface SpectrogramProps {
  fftSize: number;
  showFreqs: number;
  recording: boolean;
  stream: MediaStream | undefined;
  visualizationType: string;
}

const Spectrogram = forwardRef((props: SpectrogramProps, ref) => {
  // export default function Spectrogram(props: SpectrogramProps) {
  const animationController = useRef(-1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const source = useRef<AudioNode>();
  const analyzer = useRef<AnalyserNode>();
  const canvasPos = useRef(0);

  const clearCanvas = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgb(0,255,128)";
    ctx.fill();
    canvasPos.current = 0;
  };

  useEffect(clearCanvas, [canvasRef]);

  useImperativeHandle(ref, () => ({
    clearTheCanvas() {
      clearCanvas();
    },
  }));

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

    const stft = new Uint8Array(props.showFreqs);
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

    renderSpectrogramLine(stft, ctx, canvasPos.current, canvas.height);

    canvasPos.current = nextPos;
    animationController.current = requestAnimationFrame(incrementSpectrogram);
  };

  const drawFrequencies = () => {
    if (!canvasRef.current || !analyzer.current) return;

    const stft = new Uint8Array(props.showFreqs);
    analyzer.current!.getByteFrequencyData(stft);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    // clear the display
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barStep = Math.round(canvas.width / stft.length);
    const barWidth = Math.round(barStep / 2);
    const dh = (1.0 / 255) * canvas.height;

    const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grd.addColorStop(0, "rgb(255,0,0)");
    grd.addColorStop(1, "rgb(0,255,0)");
    ctx.fillStyle = grd;

    for (let i = 0; i < stft.length; i++) {
      const x = i * barStep;
      const h = stft[i] / dh;
      ctx.fillRect(x, canvas.height - h, barWidth, h);
    }

    animationController.current = requestAnimationFrame(drawFrequencies);
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
      cancelAnimationFrame(animationController.current);
      switch (props.visualizationType) {
        case "spectrogram":
          animationController.current =
            requestAnimationFrame(incrementSpectrogram);
          break;

        case "frequencies":
          animationController.current = requestAnimationFrame(drawFrequencies);
          break;

        default:
          console.log("invalid vis type");
      }
    }
  } else {
    source.current = undefined;
    analyzer.current = undefined;
    cancelAnimationFrame(animationController.current);
  }

  return (
    <canvas
      ref={canvasRef}
      width={1024}
      height={256}
      color="rgb(0,255,0)"
      style={{ border: "1px solid #ffffff" }}
    />
  );
});

export default Spectrogram;
