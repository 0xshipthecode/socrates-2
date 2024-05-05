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

# speech model
voice = PiperVoice.load(
    "../voices/cs_CZ-jirka-medium.onnx", "../voices/cs_CZ-jirka-medium.onnx.json", True
)


async def handle_speech(websocket: WebSocket):
    """
    Handle each speech request chunk (=typically sentence)
    by sentence until <END> message is received.
    """
    while True:
        text = await websocket.receive_text()
        print(f"SPEECH request: {text}")
        if text == "<END>":
            break

        audio = voice.synthesize_stream_raw(text)
        for audio_bytes in audio:
            print(f"generated {len(audio_bytes)} bytes.")
            await websocket.send_bytes(audio_bytes)


@app.websocket("/speak")
async def speak_endpoint(websocket: WebSocket):
    await websocket.accept()
    await handle_speech(websocket)
