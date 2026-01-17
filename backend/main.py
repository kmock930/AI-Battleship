from llm.openrouter_client import ask_openrouter

def main():
    prompt = "What is the meaning of life?"
    reply = ask_openrouter(prompt)
    print("AI Reply:", reply)

if __name__ == "__main__":
    main()
