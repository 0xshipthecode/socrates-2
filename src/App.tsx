import "./App.css";
import { useRef, useState } from "react";
import AudioVisualization from "./components/AudioVisualization";
import SpeechProcessing from "./components/SpeechProcessing.tsx";
import PumpkinHead from "./components/PumpkinHead.tsx";
import { loadSystemConfig } from "./config/config.ts";

export default function App() {
  const fftSize = 1024;

  const systemConfig = loadSystemConfig();

  const [showFreqs, setShowFreqs] = useState(256);
  const [visualizationType, setVisualizationType] = useState("pumpkin");
  const [stream, setStream] = useState<MediaStream | undefined>(undefined);
  const spectrogramRef = useRef<typeof AudioVisualization>();
  const [assistant, setAssistant] = useState(systemConfig.assistants[0]);
  const [principal, setPrincipal] = useState(systemConfig.principals[0]);

  const findAssistant = (name: string) => systemConfig.assistants.find((a) => a.name === name)!;
  const findPrincipal = (name: string) => systemConfig.principals.find((p) => p.name === name)!;

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
          <option value="pumpkin">Pumpkin head</option>
          <option value="spectrogram">Spectrogram</option>
          <option value="frequencies">Frequencies</option>
          <option value="cepstral">Cepstral</option>
        </select>
        <select
        style={{ margin: "0.5em" }}
        name="Assistant"
        id="assistant"
        onChange={(e) => setAssistant(findAssistant(e.target.value))}>
          {systemConfig.assistants.map((value) => <option key="${value.name}" value={value.name}>{value.name}</option>)}
        </select>
       <select
        style={{ margin: "0.5em" }}
        name="Principal"
        id="principal"
        onChange={(e) => setPrincipal(findPrincipal(e.target.value))}>
         {systemConfig.principals.map((value) => <option key="${value.name}" value={value.name}>{value.name}</option>)}
         </select>
      </div>
      <div>
        {(visualizationType === "spectrogram" ||
          visualizationType == "frequencies") && (
          <AudioVisualization
            ref={spectrogramRef}
            showFreqs={showFreqs}
            visualizationType={visualizationType}
            fftSize={fftSize}
            stream={stream}
            recording={recording}
          />
        )}
        {visualizationType === "pumpkin" && <PumpkinHead stream={stream} />}
        <SpeechProcessing stream={stream} recording={recording} assistant={assistant} principal={principal}/>
      </div>
    </div>
  );
}
