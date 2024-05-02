class AudioLevelProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.volume = 0;
    this.interval = 25;
    this.nextFrame = this.interval;
  }

  process(inputList, outputList, parameters) {
    const firstInput = inputList[0];

    if (firstInput.length > 0) {
      const inputData = firstInput[0];
      let sumSquares = 0;

      for (let i = 0; i < inputData.length; ++i) {
        sumSquares += inputData[i] * inputData[i];
      }

      const rms = Math.sqrt(sumSquares / inputData.length);
      this.volume = Math.max(0, Math.min(1, rms));

      this.nextFrame -= inputData.length;
      if (this.nextFrame < 0) {
        this.nextFrame += (this.interval / 1000) * sampleRate;
        this.port.postMessage({ volume: this.volume });
      }
    }

    return true;
  }
}

registerProcessor("audiolevel", AudioLevelProcessor);
