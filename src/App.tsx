import "./App.css";
import { useState } from "react";
import Spectrogram from "./components/Spectrogram";

export default function App() {
  const fftSize = 1024;

  const [showFreqs, setShowFreqs] = useState(256);
  const [stream, setStream] = useState<MediaStream | undefined>(undefined);

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
        <select
          style={{ margin: "0.5em" }}
          name="FFT Show"
          id="fft-show"
          onChange={(e) => setShowFreqs(parseInt(e.target.value))}
        >
          <option value="256">256</option>
          <option value="128">128</option>
        </select>
      </div>
      <div>
        <Spectrogram
          showFreqs={showFreqs}
          fftSize={fftSize}
          stream={stream}
          recording={recording}
        />
      </div>
    </div>
  );
}
