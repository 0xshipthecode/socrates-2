

/**
 * This class supports using the Piper backend to convert text to speech in chunks (typically sentences).
 * Each chunk is queued up for playback and auto-played when first chunk is received.
 */
export class TextPlayer {

	// Initialize the audio context and websocket connection
	constructor() {
		this.audioContext = new AudioContext();
		this.startTime = this.audioContext.currentTime;
		this.samples = new Float32Array();
		this.speechQueue = []
		this.socketOpen = false;
		this.websocket = new WebSocket("ws://localhost:8082/speak");
		this.websocket.binaryType = "arraybuffer";

		this.websocket.onmessage = (event: MessageEvent) => {
			const count = event.data.byteLength / 2;
			console.log(`received ${count} PCM samples`);
			const int16 = new Int16Array(event.data);
			const flt32 = new Float32Array(count);
			for (let i = 0; i < count; i++) {
				flt32[i] = int16[i] / 16384;
			}
			this.feedSamples(flt32);
			this.flush();
		};

		this.websocket.onopen = (_event: Event) => {
			this.flushSpeechQueue();
			this.socketOpen = true;
		};
	}

	speakText(text: string) {
		if(this.socketOpen) {
			console.log("direct send");
			this.websocket.send(text);
		} else {
			console.log("queuing text");
			this.speechQueue.push(text);
		}
	}

	flushSpeechQueue() {
		while(this.speechQueue.length > 0) {
			this.websocket.send(this.speechQueue.shift()!);
		}
	}

	feedSamples(newSamples: Float32Array) {
		const updatedSamples = new Float32Array(this.samples.length + newSamples.length)
		updatedSamples.set(this.samples, 0)
		updatedSamples.set(newSamples, this.samples.length);
		this.samples = updatedSamples
	}

	destroy() {
		this.samples = new Float32Array()
		this.audioContext?.close()
		this.audioContext = undefined
	}

	flush() {
		if (!this.samples.length) return;
		if (!this.audioContext) return;

		const ctx = this.audioContext!;
		const buffer = ctx.createBuffer(1, this.samples.length, 22050);
		buffer.getChannelData(0).set(this.samples);

		const bufSource = ctx.createBufferSource();
		bufSource.buffer = buffer;

		bufSource.connect(ctx.destination);
		if (this.startTime < ctx.currentTime) {
			this.startTime = ctx.currentTime;
		}

		bufSource.start(this.startTime);
		this.startTime += buffer.duration;
		this.samples = new Float32Array();
	}


	audioContext: AudioContext | undefined
	startTime: number
	samples: Float32Array
	websocket: WebSocket
	speechQueue: string[]
	socketOpen: boolean
}
