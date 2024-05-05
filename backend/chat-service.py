import openai
import anthropic

from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pydantic_core import from_json

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
claudeClient = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
openaiClient = openai.Client(api_key=os.environ["OPENAI_API_KEY"])


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

        print(msg)
        return ProcessingResult(status="success", text=msg.content[0].text)
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


async def handle_claude_chat(query: LLMQueryData, websocket: WebSocket):
    with claudeClient.messages.stream(
        model="claude-3-sonnet-20240229",
        max_tokens=512,
        messages=[{"role": "user", "content": query.query}],
    ) as stream:
        for text in stream.text_stream:
            if text is not None:
                await websocket.send_text(text)

        await websocket.send_text("<RESPCOMPLETE>")


async def handle_chatgpt_chat(query: LLMQueryData, websocket: WebSocket):
    # send query to chat gpt
    stream = openaiClient.chat.completions.create(
        model="gpt-4-turbo",
        max_tokens=512,
        messages=[
            {"role": "system", "content": query.prompt},
            {"role": "user", "content": query.query},
        ],
        stream=True,
    )

    for chunk in stream:
        content = chunk.choices[0].delta.content
        if content is not None:
            await websocket.send_text(content)

    await websocket.send_text("<RESPCOMPLETE>")


@app.websocket("/chat")
async def chat_endpoint(websocket: WebSocket):
    """
    Handle chat request by sending tokens to the backend and streaming
    the tokens received back to the sender as they are received.
    """
    await websocket.accept()
    data = await websocket.receive_text()
    query = LLMQueryData.model_validate(from_json(data))

    if query.model == "chatgpt":
        await handle_chatgpt_chat(query, websocket)
    elif query.model == "claude":
        await handle_claude_chat(query, websocket)
    else:
        await websocket.send_text(f"Failed to understand request /chat: {data}")
