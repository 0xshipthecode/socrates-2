import { useEffect, useState } from "react";

export const useAudioLevel = (stream: MediaStream | undefined) => {
  const [micVolume, setMicVolume] = useState(0);

  useEffect(() => {
    if (!stream) {
      setMicVolume(0);
      return;
    }

    const audioContext: AudioContext = new AudioContext();
    const mediaStreamSource = audioContext.createMediaStreamSource(stream);
    let node: AudioWorkletNode | undefined;

    const startProcessing = async () => {
      try {
        await audioContext.audioWorklet.addModule(`/audiolevel-processor.js`);

        node = new AudioWorkletNode(audioContext, "audiolevel");

        node.port.onmessage = (event) => {
          let volume = 0;
          if (event.data.volume) volume = event.data.volume;
          if (!node) return;
          setMicVolume(volume);
        };

        mediaStreamSource.connect(node).connect(audioContext.destination);
      } catch {
        console.log("useAudioLevel problem");
      }
    };

    startProcessing();

    return () => {
      node?.disconnect();
      node = undefined;
      mediaStreamSource?.disconnect();
      audioContext?.close();
    };
  }, [stream]);

  return micVolume;
};
