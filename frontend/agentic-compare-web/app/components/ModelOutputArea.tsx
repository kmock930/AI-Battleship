"use client";

import { useEffect } from "react";
import { getAvailableModels, type Model } from "../lib/api";
import { CircularProgress } from "@mui/material";

interface ModelResponse {
  response: string;
  isError: boolean;
  isLoading: boolean;
  modelValue: string;
  actualModelName?: string;
}

interface ModelOutputAreaProps {
  numModels: number;
  models: Model[];
  setModels: React.Dispatch<React.SetStateAction<Model[]>>;
  onModelSelect: (index: number, modelValue: string) => void;
  selectedModels: string[];
  modelResponses: Record<number, ModelResponse>;
}

export default function ModelOutputArea({
  numModels,
  models,
  setModels,
  onModelSelect,
  selectedModels,
  modelResponses
}: ModelOutputAreaProps) {

  useEffect(() => {
    getAvailableModels().then(setModels);
  }, []);

  useEffect(() => {
    // Ensure models array has at least numModels entries
    setModels(prevModels => {
        const updatedModels = [...prevModels];
        while (updatedModels.length < numModels) {
            updatedModels.push({ value: "", label: "" });
        }
        return updatedModels;
    });
  }, [numModels]);

  return (
    <div className="overflow-y-auto overflow-x-hidden p-4 border-b border-gray-300">
        <div className="flex flex-wrap gap-4">
            {Array.from({ length: numModels }, (_, index) => {
                const modelResponse = modelResponses[index];
                const selectedValue = selectedModels[index] || "";
                // If response has arrived and nothing was selected, show "openrouter/auto"
                // Otherwise show what user selected (or empty if unselected and no response yet)
                const hasResponse = modelResponse && !modelResponse.isLoading;
                const displayValue = (!selectedValue && hasResponse) ? "openrouter/auto" : selectedValue;
                
                // Check which models are selected in other cards
                const isModelSelectedElsewhere = (modelValue: string) => {
                  return selectedModels.some((selected, i) => 
                    i !== index && selected === modelValue && selected !== ""
                  );
                };

                return (
                  <div key={index} className="w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.67rem)]">
                      <div className="p-2">
                          Model {index + 1}:{" "}
                          <select 
                              className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
                              value={displayValue}
                              onChange={(e) => onModelSelect(index, e.target.value)}
                          >
                              <option value="" disabled hidden>Select a model...</option>
                              {models.filter(model => model.value !== "").map((model, idx) => (
                                  <option 
                                      key={`${model.value}-${idx}`} 
                                      value={model.value}
                                      disabled={isModelSelectedElsewhere(model.value)}
                                  >
                                      {model.label}
                                  </option>
                              ))}
                          </select>
                          {modelResponse?.actualModelName && modelResponse.actualModelName !== selectedValue && (
                            <div className="text-xs text-gray-500 mt-1">
                              Auto-selected: {models.find(m => m.value === modelResponse.actualModelName)?.label || modelResponse.actualModelName}
                            </div>
                          )}
                          <div className="mt-2 w-full">
                              {modelResponse?.isLoading ? (
                                <div className="w-full p-2 border border-gray-300 rounded flex items-center justify-center" style={{minHeight: "240px"}}>
                                  <CircularProgress />
                                </div>
                              ) : (
                                <textarea
                                    className={`w-full p-2 border border-gray-300 rounded focus:outline-none ${modelResponse?.isError ? 'text-red-600' : ''}`}
                                    rows={10}
                                    readOnly
                                    placeholder="Model output will appear here..."
                                    value={modelResponse?.response || ""}
                                />
                              )}
                          </div>
                      </div>
                  </div>
                );
            })}
        </div>
    </div>
  )
}