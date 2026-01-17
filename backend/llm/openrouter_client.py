import os
from openai import OpenAI
from dotenv import load_dotenv
from utils.parser import parse_llm_json

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
def ask_openrouter(prompt, model="openai/gpt-oss-20b:free"):
    completion = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}]
    )
    return completion.choices[0].message.content
