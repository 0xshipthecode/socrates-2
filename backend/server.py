from faster_whisper import WhisperModel
import openai
import anthropic

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import base64
import numpy as np
import os


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


class LLMQueryData(BaseModel):
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
            ],
        )
        print(msg)
        return ProcessingResult(status="success", text=msg.choices[0].message.content)
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))
