from urllib import request
from fastapi.concurrency import asynccontextmanager
from llm.openrouter_client import ask_openrouter
from utils.logger import get_logger
import json
# Fast API
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
import uvicorn

# Initialize cutom logger
logger = get_logger("MainApp")

# Event Streamer
# Define a lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Code to run on startup
    logger.info("Application starting up... Initializing resources.")
    yield
    # Code to run on shutdown
    logger.info("Application shutting down... Cleaning up resources.")

app = FastAPI(lifespan=lifespan)

# Endpoints
@app.get("/")
def read_root():
    return {"message": "Hello World"}

@app.post("/ask_openrouter")
async def ask_openrouter_endpoint(request: Request):
    data = await request.json()
    user_query = data.get("query", "")
    logger.info(f"Received query for OpenRouter: {user_query}")
    
    result = await ask_openrouter(user_query)

    if "error" not in result:
        logger.info("OpenRouter request processed successfully.")
    else:
        logger.error(f"OpenRouter request failed: {result['error']}")
    
    return result

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)