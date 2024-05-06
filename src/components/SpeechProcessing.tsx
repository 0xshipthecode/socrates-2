import { MicVAD } from "@ricky0123/vad-web";
import { useState, useRef, useEffect } from "react";
import { PrincipalConfig, AssistantConfig } from "../config/types";
import { TextPlayer } from "../utils/text_player";

interface VADProps {
  stream: MediaStream | undefined;
  recording: boolean;
  assistant: AssistantConfig;
  principal: PrincipalConfig;
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
    switch (result.status) {
      case "add_new":
        setTranscriptions((texts: string[]) => [
          result.text,
          ...texts.slice(0, 5),
        ]);
        break;
      case "update":
        setTranscriptions((texts: string[]) => [
          result.text,
          ...texts.slice(1, 5),
        ]);
        break;
      default:
        console.log(`failed to process ${result}`);
        break;
    }
    setDetectorState("waiting");
  };

  async function sendSpeechToBackend(
    audio: Float32Array,
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

  async function processUtterance(utterance: ProcessingResult) {
    if (utterance.status === "success") {
      setDetectorState("thinking ...");

      const chatWs = new WebSocket("ws://localhost:8081/chat");
      const player = new TextPlayer();

      let response = "";
      let speakBuffer = "";

      chatWs.onmessage = (event) => {
        if (response.length == 0) {
          // initialize new response
          updateTexts({ status: "add_new", text: "" });
        }

        if (event.data === "<RESPCOMPLETE>") {
          console.log(`response completed - closing CHAT websocket`);
          chatWs.close();
          if (speakBuffer != "") {
            player.speakText(speakBuffer);
          }
          player.speakText("<END>");
        } else {
          response = response.concat(event.data);
          for (const ch of event.data) {
            speakBuffer = speakBuffer.concat(ch);
            if ("!.?".includes(ch)) {
              player.speakText(speakBuffer);
              speakBuffer = "";
            }
          }

          updateTexts({ status: "update", text: response });
        }
      };

      // fire off the query
      chatWs.onopen = () =>
        chatWs.send(
          JSON.stringify({
            model: "chatgpt",
            prompt: props.assistant.prompt + "\n\n" + props.principal.prompt,
            query: utterance.text,
          }),
        );
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
