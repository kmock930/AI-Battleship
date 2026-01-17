# Modeling
Any kind of codes for the system's "brain" goes here!

## Components
* LLM Recommendation Model
* Use the best model suggested by OpenRouter by default (optional)
* Parsing results specifically from YellowCake API's response.

## Prerequisites
1. Make sure Python is installed. 
2. Make sure you have a virtual environment. If not, create it with the following command:
```bash
python -m venv model-venv
```
3. Activate the virtual environment:
```bash
model-venv/Scripts/activate
```
4. Install all dependencies into the virtual environment based on the `model/requirements.txt` file:
```bash
pip install -r ./model/requirements.txt
```
5. Make sure you have all the API keys necessary in a separate `.env` file at the root directory of the project. 
* Please **DO NOT** commit it to Git. For more information of what's needed, please refer to `.env.sample`.
6. Some prompts are defined in this directory:
* `PROMPT_GEMINI_URL_PARSING.txt` - parsing a list of valid URLs for YellowCake API using Google Gemini. 
* `PROMPT_GEMINI_VERIFY_PROMPT.txt` - verifying whether the user's prompt with the list of URLs are within the intended use case before launching YellowCake API. 

## Functions
In `external_api.py`, there are a few functions calling Google Gemini and YellowCake respectively. We have 2 purposes here: 
1. Get all valid URLs from the user's prompt based on ReGex parsing and optionally with the assistance from Gemini. 
2. Ask YellowCake via API access to scrape relevant information from those valid URLs based on the user's prompt.
* You can try to run this file with `py external_api.py` to check the behaviors. 