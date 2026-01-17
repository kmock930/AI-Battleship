import os
from openai import OpenAI
from dotenv import load_dotenv
from utils.parser import parse_llm_json
from utils.logger import get_logger

# Initialize your custom logger
logger = get_logger("OpenRouterClient")

# Load environment variables from .env
load_dotenv()

# Read API key
API_KEY = os.getenv("OPENROUTER_API_KEY")
if not API_KEY:
    raise ValueError("OPENROUTER_API_KEY is not set in .env")

# Reusable client
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=API_KEY,
)

# Reusable function to send a prompt
def ask_openrouter(user_input, model="openai/gpt-oss-20b:free"):
    logger.info(f"Calling model {model}")
    
    #system_instruction = "Respond ONLY with valid JSON. Required key: 'response'."
    system_instruction = (
        "Task: Respond ONLY with valid JSON.\n"
        "Format: {\"response\": \"...\"}\n"
        "Constraint: No prose, no markdown, no conversational text."
    )

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_input}
            ],
            temperature=0
        )
        
        raw_response = completion.choices[0].message.content
        logger.info("Received raw response from AI.")

        parsed_data = parse_llm_json(raw_response)
        
        if "error" in parsed_data:
            logger.error("Failed to parse JSON response.")
        else:
            logger.info("JSON successfully validated.")
            
        return parsed_data
        
    except Exception as e:
        logger.exception("Unexpected error during API call") # Log full stack trace
        return {"error": str(e)}