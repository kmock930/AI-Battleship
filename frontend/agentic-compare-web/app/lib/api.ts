// Mock API function to get available models
// TODO: Replace with actual API call when backend is ready
export interface Model {
  value: string;
  label: string;
}

export async function getAvailableModels(): Promise<Model[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return [
    { value: "gpt-4", label: "GPT-4" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    { value: "claude-3", label: "Claude 3" },
    { value: "yellowcake", label: "YellowCake API (For Automation)" },
    { value: "llama-2", label: "Llama 2" },
  ];
}
