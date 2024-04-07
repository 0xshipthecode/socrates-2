from faster_whisper import WhisperModel

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import base64
import numpy as np


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

whisper = WhisperModel("large-v3", compute_type="int8")


class TranscribeData(BaseModel):
    audio: str


@app.post("/transcribe")
async def transcribe(item: TranscribeData):
    try:
        base64_bytes = base64.b64decode(item.audio)
        arr = np.frombuffer(base64_bytes, dtype=np.float32)
        print(f"have {len(arr)} floats on input, transcribing ...")
        segments, info = whisper.transcribe(arr, language="cs", vad_filter=False)

        print(info)

        texts = []
        for segment in segments:
            print("[%.2fs -> %.2fs] %s" % (segment.start, segment.end, segment.text))
            texts.append(segment.text.strip())

        return {"status": "success", "text": " ".join(texts)}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail=str(e))
