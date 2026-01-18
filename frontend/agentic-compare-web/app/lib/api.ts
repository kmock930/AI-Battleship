// Mock API function to get available models
// TODO: Replace with actual API call when backend is ready
export interface Model {
  value: string;
  label: string;
}

// Simple token counting function (approximation)
// Uses word count / 0.75 as a rough estimate (1 token ~= 0.75 words)
function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // Count words (split by whitespace)
  const words = text.trim().split(/\s+/).length;
  // Estimate tokens (rough approximation: 1 token ≈ 0.75 words)
  return Math.ceil(words / 0.75);
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
  try {
    // Get backend URL from environment variable (defaults to localhost:8000)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    // Call the real backend API
    const response = await fetch(`${backendUrl}/models`);
    
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Return the models from the API
    return data.models;
  } catch (error) {
    console.warn('Failed to fetch models from API, falling back to default models:', error);
    
    // Fallback to mock data if API call fails
    return defaultModels;
  }
}

export async function getPromptResults(
  prompt: string, 
  models: Model[],
  onModelResponse: (modelValue: string, response: string, isError: boolean, actualModelName?: string, tokenCount?: number) => void
): Promise<void> {
  // Get backend URL from environment variable
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  
  // Extract model values for the API call
  const modelValues = models.map(m => m.value);
  
  // Track which models we sent (for mapping responses back)
  const sentModels = new Set(modelValues);
  const autoModelCount = modelValues.filter(m => m === 'openrouter/auto' || m.includes('auto')).length;
  let autoResponsesReceived = 0;
  
  try {
    // Call the real backend API with streaming
    const response = await fetch(`${backendUrl}/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        models: modelValues,
      }),
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    // Handle Server-Sent Events (SSE) stream
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Response body is not readable');
    }

    let buffer = '';
    const processedMessages = new Map<string, number>(); // Track how many times each message was processed

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages (format: "data: {json}\n\n")
      const lines = buffer.split('\n\n');
      
      console.log('Buffer split into', lines.length, 'parts');
      
      // Keep the last incomplete message in the buffer
      buffer = lines.pop() || '';

      // Process each complete message
      for (const line of lines) {
        console.log('Processing line:', line.substring(0, 50) + '...');
        if (line.startsWith('data: ')) {
          // Parse to check if this is an auto response (model not in our sent list)
          try {
            const parsed = JSON.parse(line.slice(6));
            const isAutoResponse = parsed.model && !sentModels.has(parsed.model);
            
            // For auto responses, allow as many as we need (ignore duplicates)
            // For regular responses, skip duplicates
            if (!isAutoResponse) {
              const seenCount = processedMessages.get(line) || 0;
              if (seenCount > 0) {
                console.log('Skipping duplicate non-auto message');
                continue;
              }
              processedMessages.set(line, 1);
            } else {
              // Auto response - check if we've received enough
              if (autoResponsesReceived >= autoModelCount) {
                console.log('Skipping excess auto response (already received:', autoResponsesReceived, ')');
                continue;
              }
            }
          } catch (e) {
            // If parse fails, skip duplicate detection
            if (processedMessages.has(line)) {
              console.log('Skipping duplicate message');
              continue;
            }
            processedMessages.set(line, 1);
          }
          
          try {
            const jsonData = line.slice(6); // Remove "data: " prefix
            const parsed = JSON.parse(jsonData);
            
            console.log('SSE parsed:', { model: parsed.model, hasError: !!parsed.error, hasResponse: !!parsed.response });
            
            // The API returns the actual model that responded
            const returnedModelName = parsed.model;
            
            // Determine which of our sent models this response corresponds to
            let originalModelValue = returnedModelName;
            
            // If the returned model is not one we sent exactly, it must be from an auto selection
            if (!sentModels.has(returnedModelName)) {
              // This response is from an auto selection
              if (autoResponsesReceived < autoModelCount) {
                originalModelValue = 'openrouter/auto';
                autoResponsesReceived++;
                console.log('Mapped to auto, counter now:', autoResponsesReceived);
              }
            }
            
            // Call the callback with the original model value we sent, plus the actual model name
            if (parsed.error) {
              console.log('Calling callback for error');
              const tokenCount = estimateTokenCount(parsed.error);
              onModelResponse(originalModelValue, parsed.error, true, returnedModelName, tokenCount);
            } else if (parsed.response) {
              console.log('Calling callback for response');
              const tokenCount = estimateTokenCount(parsed.response);
              onModelResponse(originalModelValue, parsed.response, false, returnedModelName, tokenCount);
            }
          } catch (parseError) {
            console.error('Failed to parse SSE message:', line, parseError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch prompt results:', error);
    
    // Notify all models of the error
    const errorMessage = 'Failed to connect to the API';
    const tokenCount = estimateTokenCount(errorMessage);
    models.forEach(model => {
      onModelResponse(model.value, errorMessage, true, undefined, tokenCount);
    });
  }
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

export async function getModelEvaluationResults(
  models: Model[], 
  realMetrics?: Record<string, { responseTime: number; outputTokens: number }>
): Promise<any> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Use real metrics if available, otherwise fall back to mock data
  const metricsToUse = realMetrics && Object.keys(realMetrics).length > 0 
    ? realMetrics 
    : mockEvaluationResults;

  // Only consider the selected models for evaluation
  const selectedModelResults: Record<string, { responseTime: string | number; outputTokens: number }> = {};
  models.forEach(model => {
    if (metricsToUse[model.value]) {
      const metrics = metricsToUse[model.value];
      selectedModelResults[model.value] = {
        responseTime: typeof metrics.responseTime === 'number' 
          ? `${metrics.responseTime}ms` 
          : metrics.responseTime,
        outputTokens: metrics.outputTokens
      };
    }
  });

  // Add Best Model's name by the lowest response time and tokens used (only from selected models)
  const bestModelName = Object.entries(selectedModelResults).reduce((best, [modelName, result]) => {
    if (!best) return modelName;
    const bestResult = selectedModelResults[best];
    const resultTime = typeof result.responseTime === 'string' 
      ? parseFloat(result.responseTime) 
      : result.responseTime;
    const bestTime = typeof bestResult.responseTime === 'string'
      ? parseFloat(bestResult.responseTime)
      : bestResult.responseTime;
    
    if (resultTime < bestTime ||
        (resultTime === bestTime && result.outputTokens < bestResult.outputTokens)) {
      return modelName;
    }
    return best;
  }, Object.keys(selectedModelResults)[0]);

  // Return evaluation results
  return models.reduce((results, model) => {
    results[model.value] = selectedModelResults[model.value] || { responseTime: "N/A", outputTokens: 0 };
    results["bestModel"] = bestModelName;
    return results;
  }, {} as any);
}
