import os
import asyncio  # Needed for the timeout logic
import sys
from pathlib import Path

# Add parent directory to path for imports
BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from openai import AsyncOpenAI
from dotenv import load_dotenv
from utils.parser import parse_llm_json
from utils.logger import get_logger

# Initialize logger
logger = get_logger("OpenRouterClient")

# Import YellowCake prompt
PROJECT_ROOT = BACKEND_DIR.parent
sys.path.append(str(PROJECT_ROOT))
from model.external_api import get_valid_urls, call_yellowcake

# Load environment variables
load_dotenv()

# Read API key
API_KEY = os.getenv("OPENROUTER_API_KEY")
if not API_KEY:
    raise ValueError("OPENROUTER_API_KEY is not set in .env")

# Reusable Async client
client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=API_KEY,
    default_headers={
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "LLM Side-by-Side Aggregator"
    }
)

async def ask_openrouter(user_input, model="openai/gpt-oss-20b:free"):
    """
    Calls OpenRouter with a strict 30-second timeout.
    Returns model ID and parsed response or error.
    """
    logger.info(f"Initiating async call for model: {model}")

    # Override for YellowCake model
    if "yellowcake" in model.lower():
        logger.info("Detected YellowCake model. Processing differently.")
        # Extract URLs from user input
        urls = get_valid_urls(user_input)
        if not urls:
            logger.warning("No valid URLs found in user input for YellowCake.")
            return {"model": model, "error": "No valid URLs found in the prompt."}
        
        # For simplicity, use the first valid URL
        url_to_use = urls[0]
        logger.info(f"Calling YellowCake for URL: {url_to_use}")
        
        # Call YellowCake API
        yellowcake_response = call_yellowcake(url_to_use, user_input)
        
        return {
            "model": model,
            "response": yellowcake_response
        }
    
    system_instruction = (
        "Task: Respond ONLY with valid JSON.\n"
        "Format: {\"response\": \"...\"}\n"
        "Constraint: No prose, no markdown, no conversational text."
    )

    try:
        # Wrap the API call in wait_for to prevent infinite hanging
        completion = await asyncio.wait_for(
            client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_input}
                ],
                temperature=0
            ),
            timeout=30.0  # Seconds
        )
        
        raw_response = completion.choices[0].message.content
        logger.info(f"Received raw response from {model}")

        # Process the response
        parsed_data = parse_llm_json(raw_response)
        
        if "error" in parsed_data:
            return {"model": model, "error": parsed_data["error"]}
        
        return {
            "model": model, 
            "response": parsed_data.get("response", "No content provided.")
        }
        
    except asyncio.TimeoutError:
        logger.error(f"Request for {model} timed out after 30 seconds.")
        return {"model": model, "error": "Model response timed out."}
    except Exception as e:
        logger.exception(f"Unexpected error for {model}: {str(e)}")
        return {"model": model, "error": str(e)}