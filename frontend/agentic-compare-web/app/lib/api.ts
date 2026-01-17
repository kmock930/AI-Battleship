// Mock API function to get available models
// TODO: Replace with actual API call when backend is ready
export interface Model {
  value: string;
  label: string;
}

// Mock Model Names for dropdown selection
const defaultModels: Model[] = [
    { value: "gpt-4", label: "GPT-4" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    { value: "claude-3", label: "Claude 3" },
    { value: "yellowcake", label: "YellowCake API (For Automation)" },
    { value: "llama-2", label: "Llama 2" },
    { value: "gemini", label: "Gemini" },
  ];

export async function getAvailableModels(): Promise<Model[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return defaultModels;
}

// Mock Model Evaluation Results

const mockEvaluationResults: Record<string, { responseTime: string; outputTokens: number }> = {
  "gpt-4": { responseTime: "200ms", outputTokens: 1500 },
  "gpt-3.5-turbo": { responseTime: "150ms", outputTokens: 1200 },
  "claude-3": { responseTime: "250ms", outputTokens: 1300 },
  "yellowcake": { responseTime: "300ms", outputTokens: 1100 },
  "llama-2": { responseTime: "400ms", outputTokens: 1000 },
  "gemini": { responseTime: "180ms", outputTokens: 1400 },
};

export async function getModelEvaluationResults(models: Model[]): Promise<any> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Only consider the selected models for evaluation
  const selectedModelResults: Record<string, { responseTime: string; outputTokens: number }> = {};
  models.forEach(model => {
    if (mockEvaluationResults[model.value]) {
      selectedModelResults[model.value] = mockEvaluationResults[model.value];
    }
  });

  // Add Best Model's name by the lowest response time and tokens used (only from selected models)
  const bestModelName = Object.entries(selectedModelResults).reduce((best, [modelName, result]) => {
    if (!best) return modelName;
    const bestResult = selectedModelResults[best];
    const resultTime = parseFloat(result.responseTime);
    const bestTime = parseFloat(bestResult.responseTime);
    
    if (resultTime < bestTime ||
        (resultTime === bestTime && result.outputTokens < bestResult.outputTokens)) {
      return modelName;
    }
    return best;
  }, Object.keys(selectedModelResults)[0]);

  // Return mock evaluation results
  return models.reduce((results, model) => {
    results[model.value] = mockEvaluationResults[model.value] || { responseTime: "N/A", outputTokens: 0 };
    results["bestModel"] = bestModelName;
    return results;
  }, {} as any);
}
