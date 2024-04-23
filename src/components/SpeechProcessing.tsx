import { MicVAD } from "@ricky0123/vad-web";
import { useState, useRef, useEffect } from "react";

interface VADProps {
  stream: MediaStream | undefined;
  recording: boolean;
}

interface ProcessingResult {
  status: string;
  text: string;
}

const SpeechProcessing = (props: VADProps) => {
  const vad = useRef<MicVAD | null>(null);
  const [transcriptions, setTranscriptions] = useState<string[]>([]);
  const [detectorState, setDetectorState] = useState("waiting");

  // this should in fact store/load query/response pairs from database
  const updateTexts = (result: ProcessingResult) => {
    const newText = result.status == "success" ? result.text : "Nepodarilo se";
    setTranscriptions((texts: string[]) => [newText, ...texts.slice(0, 5)]);
    setDetectorState("waiting");
  };

  async function sendSpeechToBackend(
    audio: Float32Array
  ): Promise<ProcessingResult> {
    const base64url: string = await new Promise((r) => {
      const reader = new FileReader();
      reader.onload = () => r(reader.result as string);
      reader.readAsDataURL(new Blob([audio]));
    });

    const base64 = base64url.slice(base64url.indexOf(",") + 1);

    console.log("sending data for analysis ...");
    setDetectorState("transcription");

    const response = await fetch("http://localhost:8080/transcribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ audio: base64 }),
    });

    const result = await response.json();

    console.log(result);
    return result;
  }

  const mysakPrompt =
    "Jsi asistent Myšák, který se snaží být nápomocný Adélce, osmileté holčičce.";

  async function processUtterance(utterance: ProcessingResult) {
    if (utterance.status === "success") {
      setDetectorState("thinking ...");
      const response = await fetch("http://localhost:8080/chatgpt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: mysakPrompt, query: utterance.text }),
      });

      const result: ProcessingResult = await response.json();

      if (result.status === "success") {
        updateTexts(result);
      } else {
        updateTexts({ status: "query_failed", text: utterance.text });
      }
    } else {
      updateTexts({ status: "transcription_failed", text: "" });
    }
  }

  useEffect(() => {
    if (props.recording && !vad.current) {
      MicVAD.new({
        stream: props.stream,
        onSpeechStart: () => {
          console.log("speech start detected ...");
          setDetectorState("in speech");
        },
        onSpeechEnd: (audio: Float32Array) => {
          console.log(`speech done with ${audio.length} samples`);
          sendSpeechToBackend(audio).then((result) => processUtterance(result));
        },
        onVADMisfire: () => {
          console.log("speech was too short, misfire");
        },
      }).then((newVAD: MicVAD) => {
        newVAD.start();
        console.log("vad started ...");
        vad.current = newVAD;
      });
    }

    return () => {
      vad.current?.destroy();
      vad.current = null;
    };
  }, [props.stream, props.recording]);

  return (
    <div>
      <p> {detectorState} </p>
      <ul>
        {transcriptions.map((text, index) => (
          <li key={index}>{text}</li>
        ))}
      </ul>
    </div>
  );
};

export default SpeechProcessing;
