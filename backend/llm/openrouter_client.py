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

    # Override for Google Gemini Direct API models
    if model.startswith("google-direct/"):
        logger.info("Detected Google Gemini direct API model. Processing via call_gemini.")
        try:
            # Extract the actual model name from the identifier
            actual_model_name = model.replace("google-direct/", "")
            logger.info(f"Using Gemini model: {actual_model_name}")
            
            # Call Gemini API directly in a separate thread to avoid blocking
            # Using empty base_prompt since this is a direct user query
            from model.external_api import call_gemini
            gemini_response = await asyncio.to_thread(
                call_gemini, 
                base_prompt="You are a helpful AI assistant. Respond to the user's query directly and naturally.",
                user_prompt=user_input,
                model_name=actual_model_name
            )
            
            return {
                "model": f"Google Gemini ({actual_model_name})",
                "response": gemini_response
            }
        except Exception as e:
            logger.exception(f"Error processing Google Gemini request: {str(e)}")
            return {"model": model, "error": f"Google Gemini API error: {str(e)}"}

    # Override for YellowCake model
    if "yellowcake" in model.lower():
        logger.info("Detected YellowCake model. Processing differently.")
        try:
            # Extract URLs from user input (run in thread pool since it's synchronous)
            urls = await asyncio.to_thread(get_valid_urls, user_input)
            if not urls:
                logger.warning("No valid URLs found in user input for YellowCake.")
                return {"model": model, "error": "No valid URLs found in the prompt."}
            
            # For simplicity, use the first valid URL
            url_to_use = list(urls)[0]
            logger.info(f"Calling YellowCake for URL: {url_to_use}")
            
            # Call YellowCake API in a separate thread to avoid blocking
            yellowcake_response = await asyncio.to_thread(call_yellowcake, url_to_use, user_input)
            
            return {
                "model": model,
                "response": yellowcake_response
            }
        except Exception as e:
            logger.exception(f"Error processing YellowCake request: {str(e)}")
            return {"model": model, "error": f"YellowCake processing error: {str(e)}"}
    
    
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
        
        # Get the actual model that was used (important for auto selections)
        actual_model = completion.model if hasattr(completion, 'model') else model
        logger.info(f"Actual model used: {actual_model}")

        # Process the response
        parsed_data = parse_llm_json(raw_response)
        
        if "error" in parsed_data:
            return {"model": actual_model, "error": parsed_data["error"]}
        
        return {
            "model": actual_model, 
            "response": parsed_data.get("response", "No content provided.")
        }
        
    except asyncio.TimeoutError:
        logger.error(f"Request for {model} timed out after 30 seconds.")
        return {"model": model, "error": "Model response timed out."}
    except Exception as e:
        logger.exception(f"Unexpected error for {model}: {str(e)}")
        return {"model": model, "error": str(e)}