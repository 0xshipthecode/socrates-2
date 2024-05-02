from faster_whisper import WhisperModel
import openai
import anthropic

from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pydantic_core import from_json

import base64
import numpy as np
import os

from piper import PiperVoice


app = FastAPI()

origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS", "POST"],
    allow_headers=["*"],
)

# initialize models/access to models
whisper = WhisperModel("large-v3", compute_type="int8")
voice = PiperVoice.load('../voices/cs_CZ-jirka-medium.onnx', '../voices/cs_CZ-jirka-medium.onnx.json', True)
claudeClient = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
openaiClient = openai.Client(api_key=os.environ["OPENAI_API_KEY"])


class TranscribeData(BaseModel):
    audio: str


@app.post("/transcribe")
async def transcribe(item: TranscribeData):
    try:
        base64_bytes = base64.b64decode(item.audio)
        arr = np.frombuffer(base64_bytes, dtype=np.float32)
        print(f"have {len(arr)} floats on input, transcribing ...")
        segments, info = whisper.transcribe(
            arr, language="cs", vad_filter=False)

        texts = []
        for segment in segments:
            print("[%.2fs -> %.2fs] %s" %
                  (segment.start, segment.end, segment.text))
            texts.append(segment.text.strip())

        return {"status": "success", "text": " ".join(texts)}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail=str(e))


class LLMQueryData(BaseModel):
    model: str
    prompt: str
    query: str


class ProcessingResult(BaseModel):
    status: str
    text: str


@app.post("/claude")
async def get_claude_response(query: LLMQueryData) -> ProcessingResult:
    try:
        msg = claudeClient.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=256,
            messages=[{"role": "user", "content": query.query}],
        )
        print(msg)
        return ProcessingResult(status="success", text=msg.content[0].text)
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chatgpt")
async def get_chatgpt_response(query: LLMQueryData) -> ProcessingResult:
    try:
        msg = openaiClient.chat.completions.create(
            model="gpt-4-turbo",
            max_tokens=256,
            messages=[
                {"role": "system", "content": query.prompt},
                {"role": "user", "content": query.query},
            ]
        )
        print(msg)
        return ProcessingResult(status="success", text=msg.choices[0].message.content)
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/chat")
async def chat_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:

        # here I need to receive query, send to chatgpt/claude per request and stream back the response
        # as response is streamed, I should send it directly to the piper docker container
        # and receive raw pcm output (again via websockets?) which I will pipe directly back
        # to the app
        # both the chunks received and the sound stream should be piped back in real time
        # the app will sort things out and either show response on screen or add output to audio buffer

        data = await websocket.receive_text()
        query = LLMQueryData.model_validate(from_json(data))

        if query.model == 'chatgpt':
            response = openaiClient.chat.completions.create(
                model="gpt-4-turbo",
                max_tokens=256,
                messages=[{"role": "system", "content": query.prompt}, {
                    "role": "user", "content": query.query}],
                stream=True)

            for chunk in response:
                # print(chunk)
                content = chunk.choices[0].delta.content
                if content is not None:
                    await websocket.send_text(content)

            await websocket.send_text("<RESPCOMPLETE>")
            break
        else:
            await websocket.send_text(f"Request receivbed was: {data}")


@app.websocket("/speak")
async def speak_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:

        # read input text sentenct by sentence and render into PCM speech
        # via piper model

        text = await websocket.receive_text()
        print(f"SPEECH request: {text}")
        if text == '<END>':
            break

        audio = voice.synthesize_stream_raw(text)
        for audio_bytes in audio:
            print(f"generated {len(audio_bytes)} bytes.")
            await websocket.send_bytes(audio_bytes)
