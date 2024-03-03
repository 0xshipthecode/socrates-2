import "./App.css";
import { useRef, useState } from "react";

export default function App() {
  const fftSize = 1024;
  let animationController = 0;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const source = useRef<AudioNode>();
  const analyzer = useRef<AnalyserNode>();
  const stream = useRef<MediaStream>();
  const canvasPos = useRef(0);
  const [recording, setRecording] = useState(false);
  const [showFreqs, setShowFreqs] = useState(512);

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

  const handleAudioRecord = async () => {
    const audioContext = new AudioContext();
    if (recording) {
      source.current = undefined;
      analyzer.current = undefined;
      stream.current?.getAudioTracks().forEach((track) => track.stop());
      stream.current = undefined;
      setRecording(false);
      cancelAnimationFrame(animationController);
    } else {
      setRecording(true);
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      if (!source.current) {
        source.current = audioContext.createMediaStreamSource(stream.current);
        analyzer.current = audioContext.createAnalyser();
        analyzer.current.fftSize = fftSize;
        source.current.connect(analyzer.current);
      }
      // visualizeData();
      incrementSpectrogram();
    }
  };

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
    const stft = new Uint8Array(fftSize / 2);
    analyzer.current!.getByteFrequencyData(stft);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    renderSpectrogramLine(
      stft.slice(0, showFreqs),
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

  /*
  const visualizeData = () => {
    const stft = new Uint8Array(fftSize / 2);
    analyzer.current !.getByteFrequencyData(stft);
    const bar_step = Math.floor(1024 / stft.length);
    const bar_width = Math.floor((1024 / stft.length) * 0.75);
    const canvas = canvasRef.current !;
    const ctx = canvas.getContext("2d") !;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < stft.length; i++) {
      // compute x coordinate where we would draw
      const start = i * bar_step;
      // create a gradient for the  whole canvas
      const gradient =
          ctx.createLinearGradient(0, 0, canvas.width, canvas.height, );
      gradient.addColorStop(0.2, "#2392f5");
      gradient.addColorStop(0.5, "#fe0095");
      gradient.addColorStop(1.0, "purple");
      ctx.fillStyle = gradient;
      ctx.fillRect(start, canvas.height, bar_width, -stft[i]);
    }

    animationController = window.requestAnimationFrame(visualizeData);
  };
  */

  return (
    <div className="App">
      <div style={{ margin: "1em" }}>
        <button style={{ margin: "0.5em" }} onClick={handleAudioRecord}>
          {recording ? "Stop" : "Start"}
        </button>
        <select
          style={{ margin: "0.5em" }}
          name="FFT Show"
          id="fft-show"
          onChange={(e) => setShowFreqs(parseInt(e.target.value))}
        >
          <option value="512">512</option>
          <option value="256">256</option>
          <option value="128">128</option>
        </select>
      </div>
      <div>
        <canvas
          ref={canvasRef}
          width={786}
          height={512}
          style={{ border: "1px solid #ffffff" }}
        />
      </div>
    </div>
  );
}
