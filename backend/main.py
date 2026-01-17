import asyncio
import json
from typing import List
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import your refactored async client
from llm.openrouter_client import ask_openrouter
from utils.logger import get_logger

# Initialize logger
logger = get_logger("MainApp")

app = FastAPI(title="LLM Side-by-Side Aggregator")

# 1. Setup CORS
# Crucial so your React frontend (e.g., localhost:3000) can talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev only. Replace with ["http://localhost:3000"] in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Define the Request Schema
# This matches the JSON body the frontend will send
class CompareRequest(BaseModel):
    prompt: str
    models: List[str]

async def stream_aggregator(prompt: str, models: List[str]):
    """
    The Orchestrator:
    Fires off all LLM calls in parallel and yields JSON as they finish.
    """
    logger.info(f"New Request | Prompt: {prompt[:50]}... | Models: {models}")

    # Create concurrent tasks for all selected models
    tasks = [
        asyncio.create_task(ask_openrouter(prompt, model=m)) 
        for m in models
    ]

    # Use as_completed to yield the FASTEST models first
    for finished_task in asyncio.as_completed(tasks):
        try:
            result = await finished_task
            
            # Format result as a Server-Sent Event (SSE)
            # data: {json_string}\n\n
            yield f"data: {json.dumps(result)}\n\n"
            
        except Exception as e:
            logger.error(f"A task failed: {str(e)}")
            # We still yield an error for this specific model so the UI can handle it
            error_msg = {"model": "unknown", "error": "Internal Server Error"}
            yield f"data: {json.dumps(error_msg)}\n\n"

# 3. The Endpoint
@app.post("/compare")
async def compare_endpoint(request_data: CompareRequest):
    """
    Receives prompt and models list. 
    Returns a Stream that stays open until all models finish.
    """
    return StreamingResponse(
        stream_aggregator(request_data.prompt, request_data.models),
        media_type="text/event-stream"
    )

if __name__ == "__main__":
    import uvicorn
    # Start server on http://localhost:8000
    uvicorn.run(app, host="0.0.0.0", port=8000)