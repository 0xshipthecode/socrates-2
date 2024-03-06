import "./App.css";
import { useRef, useState } from "react";
import Spectrogram from "./components/Spectrogram";

export default function App() {
  const fftSize = 1024;

  const [showFreqs, setShowFreqs] = useState(256);
  const [visualizationType, setVisualizationType] = useState("spectrogram");
  const [stream, setStream] = useState<MediaStream | undefined>(undefined);
  const spectrogramRef = useRef<typeof Spectrogram>();

  const updateRecordingStatus = (newStatus: boolean) => {
    if (newStatus) {
      navigator.mediaDevices
        .getUserMedia({
          audio: true,
          video: false,
        })
        .then((newStream: MediaStream) => {
          setStream(newStream);
        });
    } else {
      stream!.getAudioTracks().forEach((track) => track.stop());
      setStream(undefined);
    }
  };

  const recording = stream != undefined;

  return (
    <div className="App">
      <div style={{ margin: "1em" }}>
        <button
          style={{ margin: "0.5em" }}
          onClick={() => updateRecordingStatus(!recording)}
        >
          {recording ? "Stop" : "Start"}
        </button>
        <label># freqs</label>
        <select
          style={{ margin: "0.5em" }}
          name="FFT Show"
          id="fft-show"
          onChange={(e) => setShowFreqs(parseInt(e.target.value))}
        >
          <option value="256">256</option>
          <option value="128">128</option>
        </select>
        <button
          style={{ margin: "0.5em" }}
          onClick={() => spectrogramRef.current?.clearTheCanvas()}
        >
          Clear
        </button>
        <select
          style={{ margin: "0.5em" }}
          name="Visualization"
          id="visualization"
          onChange={(e) => setVisualizationType(e.target.value)}
        >
          <option value="spectrogram">Spectrogram</option>
          <option value="frequencies">Frequencies</option>
          <option value="cepstral">Cepstral</option>
        </select>
      </div>
      <div>
        <Spectrogram
          ref={spectrogramRef}
          showFreqs={showFreqs}
          visualizationType={visualizationType}
          fftSize={fftSize}
          stream={stream}
          recording={recording}
        />
      </div>
    </div>
  );
}
