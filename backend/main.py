from llm.openrouter_client import ask_openrouter
from utils.logger import get_logger
import json

# Initialize cutom logger
logger = get_logger("MainApp")

def main():
    user_query = "What is the meaning of life?"
    logger.info(f"Starting request for: {user_query}")
    
    result = ask_openrouter(user_query)

    if "error" not in result:
        logger.info("Request processed successfully.")
        print("\nFinal Output:", json.dumps(result, indent=4))
    else:
        logger.error(f"Request failed: {result['error']}")

if __name__ == "__main__":
    main()
