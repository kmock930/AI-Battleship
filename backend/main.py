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
        asyncio.create_task(ask_openrouter(prompt, model=m if m is not None or m != "" else "openrouter/auto")) 
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

# 4. An Endpoint to List Available Models
@app.get("/models")
def list_models():
    """
    Returns a list of available models from OpenRouter.
    """
    return {"models": [
        {"label": "GPT 4o", "value": "openai/gpt-4o"},
        {"label": "GPT 4o Mini", "value": "openai/gpt-4o-mini"},
        {"label": "O1 Preview", "value": "openai/o1-preview"},
        {"label": "GPT 4 Turbo", "value": "openai/gpt-4-turbo"},
        {"label": "Claude 3.5 Sonnet", "value": "anthropic/claude-3.5-sonnet"},
        {"label": "Claude 3 Opus", "value": "anthropic/claude-3-opus"},
        {"label": "Claude 3 Haiku", "value": "anthropic/claude-3-haiku"},
        {"label": "Gemini Pro 1.5", "value": "google/gemini-pro-1.5"},
        {"label": "Gemini Flash 1.5", "value": "google/gemini-flash-1.5"},
        {"label": "LLaMA 3.1 405B Instruct", "value": "meta-llama/llama-3.1-405b-instruct"},
        {"label": "LLaMA 3.1 70B Instruct", "value": "meta-llama/llama-3.1-70b-instruct"},
        {"label": "LLaMA 3.1 8B Instruct", "value": "meta-llama/llama-3.1-8b-instruct"},
        {"label": "Mistral Large 2407", "value": "mistralai/mistral-large-2407"},
        {"label": "DeepSeek Chat", "value": "deepseek/deepseek-chat"},
        {"label": "DeepSeek Coder", "value": "deepseek/deepseek-coder"},
        {"label": "Mistral 7B Instruct (Free)", "value": "mistralai/mistral-7b-instruct:free"},
        {"label": "Phi 3 Mini 128k Instruct (Free)", "value": "microsoft/phi-3-mini-128k-instruct:free"},
        {"label": "OpenRouter Auto", "value": "openrouter/auto"},
        {"label": "Google Gemini 2.0 Flash (Free - Direct API)", "value": "google-direct/gemini-2.0-flash-exp"},
        {"label": "Google Gemini 1.5 Flash (Free - Direct API)", "value": "google-direct/gemini-1.5-flash"},
        {"label": "YellowCake API (For Automation)", "value": "YellowCake"}  # Placeholder for custom models
    ]}

if __name__ == "__main__":
    import uvicorn
    # Start server on http://localhost:8000
    uvicorn.run(app, host="0.0.0.0", port=8000)