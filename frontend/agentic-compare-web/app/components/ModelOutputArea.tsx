"use client";

import { useEffect } from "react";
import { getAvailableModels, type Model } from "../lib/api";
export default function ModelOutputArea({numModels, models, setModels, onModelSelect}: {numModels: number, models: Model[], setModels: React.Dispatch<React.SetStateAction<Model[]>>, onModelSelect: (index: number, modelValue: string) => void}) {

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
            {Array.from({ length: numModels }, (_, index) => (
                <div key={index} className="w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.67rem)]">
                    <div className="p-2">
                        Model {index + 1}:{" "}
                        <select 
                            className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            defaultValue=""
                            onChange={(e) => onModelSelect(index, e.target.value)}
                        >
                            <option value="" disabled hidden>Select a model...</option>
                            {models.filter(model => model.value !== "").map((model, idx) => (
                                <option key={`${model.value}-${idx}`} value={model.value}>
                                    {model.label}
                                </option>
                            ))}
                        </select>
                        <div className="mt-2 w-full">
                            <textarea
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none"
                                rows={10}
                                readOnly
                                placeholder="Model output will appear here..."
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  )
}