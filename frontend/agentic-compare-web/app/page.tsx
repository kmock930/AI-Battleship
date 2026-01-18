"use client";

import React, { useEffect, useRef } from "react";
import { useState } from "react";
import PromptArea from "./components/PromptArea";
import ModelOutputArea from "./components/ModelOutputArea";
import ModelEvalArea from "./components/ModelEvalArea";
import { Model } from "./lib/api";
import { getAvailableModels, getPromptResults } from "./lib/api";
import { Snackbar } from "@mui/material";

interface ModelResponse {
  response: string;
  isError: boolean;
  isLoading: boolean;
  modelValue: string;
  actualModelName?: string; // The actual model chosen by OpenRouter (for auto selections)
  responseTime?: number; // Time in milliseconds
  tokenCount?: number; // Number of tokens in response
}

export default function Home() {
  const [numModels, setNumModels] = useState(2);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [modelResponses, setModelResponses] = useState<Record<number, ModelResponse>>({});
  const assignedAutoSlotsRef = useRef(new Set<number>()); // Track which auto slots have been assigned
  const [warningShown, setWarningShown] = useState(null as null | string);
  const requestStartTimeRef = useRef<number>(0); // Track when the request started

  useEffect(() => {
    getAvailableModels().then(setModels);
  }, []);

  const handleAddModel = () => {
    setNumModels(numModels + 1);
  }

  const handleModelSelection = (index: number, modelValue: string) => {
    setSelectedModels(prev => {
      const newSelected = [...prev];
      newSelected[index] = modelValue;
      return newSelected;
    });
  }

  const handleLaunch = async () => {
    if (!prompt.trim()) {
      setWarningShown("Prompt is empty");
      return;
    }

    // Check for empty slots
    const emptySlotIndexes: number[] = [];
    let hasAutoSelected = false;
    
    for (let i = 0; i < numModels; i++) {
      const selectedValue = selectedModels[i];
      if (!selectedValue || selectedValue === "") {
        emptySlotIndexes.push(i);
      } else if (selectedValue === "openrouter/auto") {
        hasAutoSelected = true;
      }
    }

    // If there are empty slots AND OpenRouter Auto is already selected, remove empty cards
    if (emptySlotIndexes.length > 0 && hasAutoSelected) {
      // Filter out empty slots
      const updatedSelectedModels = selectedModels.filter((_, i) => !emptySlotIndexes.includes(i));
      setSelectedModels(updatedSelectedModels);
      setNumModels(numModels - emptySlotIndexes.length);
      
      // Show yellow warning
      setWarningShown(`Removed ${emptySlotIndexes.length} empty model card${emptySlotIndexes.length > 1 ? 's' : ''} (OpenRouter Auto already in use)`);
      
      // Wait a brief moment for state to update before proceeding
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // If there are empty slots but no auto selected, auto-fill with OpenRouter Auto
    if (emptySlotIndexes.length > 0 && !hasAutoSelected) {
      const updatedSelectedModels = [...selectedModels];
      emptySlotIndexes.forEach(index => {
        updatedSelectedModels[index] = "openrouter/auto";
      });
      setSelectedModels(updatedSelectedModels);
      
      // Show yellow warning
      setWarningShown(`Auto-selected "OpenRouter Auto" for ${emptySlotIndexes.length} unselected model${emptySlotIndexes.length > 1 ? 's' : ''}`);
      
      // Wait a brief moment for state to update before proceeding
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Get models for each slot
    const actualSelectedModels: Model[] = [];
    const slotToModelMap: Record<string, number[]> = {}; // Maps model value to slot indexes
    
    for (let i = 0; i < numModels; i++) {
      const selectedValue = selectedModels[i] || "openrouter/auto"; // Fallback to auto if still empty
      let modelToUse: Model;
      
      // User selected a model
      const model = models.find(m => m.value === selectedValue);
      modelToUse = model || { value: selectedValue, label: selectedValue };
      
      actualSelectedModels.push(modelToUse);
      
      // Track which slots use which model values
      if (!slotToModelMap[modelToUse.value]) {
        slotToModelMap[modelToUse.value] = [];
      }
      slotToModelMap[modelToUse.value].push(i);
    }

    if (actualSelectedModels.length === 0) {
      console.warn("No models available");
      return;
    }

    // Initialize loading states for all slots
    const initialStates: Record<number, ModelResponse> = {};
    for (let i = 0; i < actualSelectedModels.length; i++) {
      initialStates[i] = {
        response: "",
        isError: false,
        isLoading: true,
        modelValue: actualSelectedModels[i].value,
      };
    }
    setModelResponses(initialStates);
    
    // Track request start time
    requestStartTimeRef.current = Date.now();

    // Collect all models to send
    const modelsToSend: Model[] = [];
    const autoSlots: number[] = []; // Track which slots are using auto
    
    // Collect all models and track auto slots
    for (let i = 0; i < actualSelectedModels.length; i++) {
      const model = actualSelectedModels[i];
      
      if (model.value === "openrouter/auto" || model.value.includes("auto")) {
        autoSlots.push(i);
        modelsToSend.push({ value: "openrouter/auto", label: "OpenRouter Auto" });
      } else {
        modelsToSend.push(model);
      }
    }
    
    console.log('Auto slots:', autoSlots);
    console.log('Models to send:', modelsToSend.map((m, i) => `${i}: ${m.value}`));
    
    // Track which auto slots have been assigned
    assignedAutoSlotsRef.current.clear();

    // Call the API
    await getPromptResults(
      prompt,
      modelsToSend,
      (modelValue, response, isError, actualModelName, tokenCount) => {
        console.log('Callback received:', { modelValue, actualModelName, isError, responseLength: response?.length, tokenCount });
        
        // Calculate elapsed time
        const responseTime = Date.now() - requestStartTimeRef.current;
        
        setModelResponses(prev => {
          const updated = { ...prev };
          
          // Special handling for auto: assign to the next sequential auto slot
          if (modelValue === "openrouter/auto" || modelValue.includes("auto")) {
            // Find the next unassigned auto slot (handles React Strict Mode double-invocation)
            const unassignedSlot = autoSlots.find(slotIdx => !assignedAutoSlotsRef.current.has(slotIdx));
            
            if (unassignedSlot === undefined) {
              return updated; // Don't process this duplicate response
            }
            
            // Mark this slot as assigned
            assignedAutoSlotsRef.current.add(unassignedSlot);
            console.log('Assigning auto response to slot:', unassignedSlot, 'assigned count:', assignedAutoSlotsRef.current.size);
            
            updated[unassignedSlot] = {
              response,
              isError,
              isLoading: false,
              modelValue: "openrouter/auto",
              actualModelName,
              responseTime,
              tokenCount,
            };
          } else {
            // For non-auto models, update all slots using this model
            const slotsToUpdate = slotToModelMap[modelValue] || [];
            slotsToUpdate.forEach(slotIndex => {
              updated[slotIndex] = {
                response,
                isError,
                isLoading: false,
                modelValue,
                actualModelName,
                responseTime,
                tokenCount,
              };
            });
          }
          
          return updated;
        });
      }
    );
  };

  // Get the actual models for evaluation (using actual model names when available)
  const actualModelsForEval = Array.from({ length: numModels }, (_, i) => {
    const response = modelResponses[i];
    if (response && !response.isLoading && !response.isError) {
      // Use the actual model name if available, otherwise use the selected value
      const modelValue = response.actualModelName || selectedModels[i] || "openrouter/auto";
      const model = models.find(m => m.value === modelValue);
      return model || { value: modelValue, label: modelValue };
    }
    return null;
  }).filter((m): m is Model => m !== null);
  
  // Build evaluation metrics from actual responses
  const evaluationMetrics: Record<string, { responseTime: number; outputTokens: number }> = {};
  for (let i = 0; i < numModels; i++) {
    const response = modelResponses[i];
    if (response && !response.isLoading && !response.isError && response.responseTime !== undefined && response.tokenCount !== undefined) {
      const modelValue = response.actualModelName || selectedModels[i] || "openrouter/auto";
      evaluationMetrics[modelValue] = {
        responseTime: response.responseTime,
        outputTokens: response.tokenCount,
      };
    }
  }

  // Determine Snackbar color based on message type
  const isAutoSelectionWarning = warningShown?.includes('Auto-selected');
  const isRemovedCardsMessage = warningShown?.includes('Removed');
  const snackbarColor = isRemovedCardsMessage ? '#4caf50' : (isAutoSelectionWarning ? '#f57c00' : '#d32f2f'); // Green for removed cards, orange for auto-selection, red for errors

  return (
    <>
      {warningShown && (
        <Snackbar 
          open={true} 
          message={warningShown} 
          onClose={() => setWarningShown(null)} 
          autoHideDuration={10000}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          ContentProps={{
            sx: {
              backgroundColor: snackbarColor,
              color: 'white',
              fontWeight: 'bold'
            }
          }}
        />
      )}
      <PromptArea 
        handleAddModel={handleAddModel} 
        prompt={prompt}
        setPrompt={setPrompt}
        handleLaunch={handleLaunch}
      />
      <ModelOutputArea 
        numModels={numModels} 
        models={models} 
        setModels={setModels} 
        onModelSelect={handleModelSelection}
        selectedModels={selectedModels}
        modelResponses={modelResponses}
      />
      <ModelEvalArea models={actualModelsForEval} realMetrics={evaluationMetrics} />
    </>
  );
}
