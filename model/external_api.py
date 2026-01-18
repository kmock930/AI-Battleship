from pathlib import Path
CURR_DIR = Path(__file__).parent

def get_valid_urls(text: str) -> list[str]:
    """
    Parses URLs from text and validates them via HTTP requests.
    """
    import re
    import os
    import requests
    # Regex breakdown:
    # 1. Look for http:// or https:// (optional)
    # 2. Look for www. (optional)
    # 3. Match domain name characters
    # 4. Match a dot followed by 2-6 alphabet characters (TLD)
    # 5. Match optional path/query parameters
    url_pattern = r'https?://(?:www\.)?[\w\-\.]+\.[a-z]{2,6}\S*'
    
    # Initial extraction
    raw_urls = re.findall(url_pattern, text, re.IGNORECASE)

    # Ask Gemini to further parse URLs from prompt
    global CURR_DIR
    base_prompt = ""
    if not os.listdir(CURR_DIR).__contains__("PROMPT_GEMINI_URL_PARSING.txt"):
        CURR_DIR = Path(__file__).parent.parent / "model" # assuming from 'backend' dir
    with open(CURR_DIR / "PROMPT_GEMINI_URL_PARSING.txt", "r") as f:
        base_prompt = f.read()
    try:
        gemini_response = call_gemini(base_prompt, text)
    except Exception:
        gemini_response = ""
    gemini_urls = set()
    if gemini_response:
        gemini_urls = set([url.strip() for url in gemini_response.split(',')])
    

    # Find Valid URLs from the above candidates
    valid_urls = set()

    for url in raw_urls + list(gemini_urls):
        # Clean up trailing punctuation often caught by regex in sentences
        url = url.rstrip('.,!?;:')
        
        try:
            # We use a timeout and head request to keep it fast
            # allow_redirects=True ensures we find the final destination
            response = requests.head(url, timeout=5, allow_redirects=True)
            
            # If the status code is under 400, we consider it "valid"
            if response.status_code < 400:
                valid_urls.add(url)
        except requests.RequestException:
            # Disregard any URL that causes a connection error or timeout
            continue
            
    return valid_urls # Return unique valid URLs

# Call Gemini - for suggesting URL(s) prior to prompt OR for checking whether user prompt is going to access YellowCake correctly
def call_gemini(base_prompt: str, user_prompt: str, model_name: str = "gemini-2.0-flash"):
    from google import genai
    from dotenv import load_dotenv
    load_dotenv()

    # The client gets the API key from the environment variable `GEMINI_API_KEY`.
    client = genai.Client()

    response = client.models.generate_content(
        model=model_name, contents=f"{base_prompt}\nUser Prompt: {user_prompt}"
    )
    return response.text


# Call YellowCake - for automating/scraping info from specified URL(s)
def call_yellowcake(url: str, user_prompt: str):
    from dotenv import load_dotenv
    import requests
    import os
    load_dotenv()
    MODEL_NAME = "YELLOWCAKE-API"

    GEMINI_VALIDATION_PROMPT = ""
    with open(CURR_DIR / "PROMPT_GEMINI_VERIFY_PROMPT.txt", "r") as f:
        GEMINI_VALIDATION_PROMPT = f.read()
    try:
        validation_response = call_gemini(GEMINI_VALIDATION_PROMPT, f"URL: {url}\nPrompt: {user_prompt}")
    except Exception:
        validation_response = "N/A"
    
    if any(keyword in validation_response.upper() for keyword in ["YES", "N/A"]):
        # Proceed with YellowCake processing
        yellowcake_api_key = os.getenv("YELLOWCAKE_APIKEY")
        if not yellowcake_api_key:
            raise ValueError("YellowCake API key not found in environment variables.")
    
        # Construct the request for YellowCake API
        from .constants import YELLOWCAKE_URL
        import json
        import re

        headers = {
            "Content-Type": "application/json",
            "X-API-Key": yellowcake_api_key
        }
        payload = {
            "url": url,
            "prompt": user_prompt
        }
    
        try:
            response = requests.post(YELLOWCAKE_URL, json=payload, headers=headers, stream=True, timeout=30)
            response.raise_for_status()
            
            # Collect the streaming response
            result = ""
            other_event_chunks: list[str] = []
            for chunk in response.iter_content(chunk_size=None, decode_unicode=True):
                STATUS_STRING = "event: complete"
                if chunk and str(chunk).strip().startswith(STATUS_STRING):
                    # Remove unnecessary parts like status strings
                    result = str(chunk).replace(STATUS_STRING, "").replace("data: ", "").strip()
                    # Convert result to Dict
                    result_dict = json.loads(result)
                    # Check if the response is successful
                    if result_dict.get("success") == True and result_dict.get("sessionId") is not None:
                        result = result_dict.get("data", "")
                        # Parse and combine all dictionaries in the list
                        if isinstance(result, list):
                            combined_result = []
                            for item in result:
                                if isinstance(item, dict):
                                    for key, value in item.items():
                                        combined_result.append(f"{key}: {value}")
                            result = "\n".join(combined_result)
                        else:
                            result = str(result)
                else:
                    # Remove unnecessary parts like status strings
                    status_regex = r"event: \w+"
                    result = re.sub(status_regex, "", str(chunk)).replace("data: ", "").strip('\n').strip()
                    try:
                        # Convert result to Dict
                        result_dict = json.loads(result)
                        if result_dict.get("data"):
                            other_event_chunks.append(result_dict.get("data"))
                        elif result_dict.get("message"):
                            other_event_chunks.append(result_dict.get("message"))
                        else:
                            other_event_chunks.append("")
                    except json.JSONDecodeError:
                        other_event_chunks.append(str(result))
            
            return result.strip() if result else other_event_chunks[-1].strip()
        except requests.RequestException as e:
           return f"Error calling YellowCake API: {str(e)}"
    else:
        return "The provided URL is not suitable for YellowCake processing."

if __name__ == "__main__":
    sample_text = """
    Here are some links you might find useful:
    https://www.example.com
    http://invalid-url.test
    https://www.openai.com/research/
    https://docs.yellowcake.dev/
    Check them out!
    """
    valid_urls = get_valid_urls(sample_text)
    print("Valid URLs found:", valid_urls)

    # Try to call YellowCake on a sample URL
    for url in valid_urls:
        result = call_yellowcake(url, "Summarize the content of this webpage.")
        print(f"YellowCake result for {url}:\n{result}\n")