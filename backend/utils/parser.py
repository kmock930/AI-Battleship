import json
import re

def parse_llm_json(raw_content):
    """
    Cleans and converts LLM string output into a Python dictionary.
    """
    if not raw_content:
        return {"error": "Empty response from LLM"}

    # Remove Markdown code blocks if present
    # This regex looks for ```json <content> ``` and extracts the middle
    clean_content = re.sub(r'```json|```', '', raw_content).strip()

    try:
        # Attempt to parse the string into a dictionary
        data = json.loads(clean_content)
        return data
    except json.JSONDecodeError:
        # Fallback: If it's not valid JSON, return the raw text in a structured way
        return {
            "error": "Invalid JSON format",
            "raw_payload": raw_content
        }