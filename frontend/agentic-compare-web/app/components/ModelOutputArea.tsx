"use client";

import React from "react";
import { useEffect, useState } from "react";
import { getAvailableModels, type Model } from "../lib/api";
import { Grid } from "@mui/material";
export default function ModelOutputArea({numModels}: {numModels: number}) {
  const [models, setModels] = useState<Model[]>([]);

  useEffect(() => {
    getAvailableModels().then(setModels);
  }, []);

  return (
    <div className="overflow-y-auto overflow-x-hidden p-4 border-b border-gray-300">
        <div className="flex flex-wrap gap-4">
            {Array.from({ length: numModels }, (_, index) => (
                <div key={index} className="w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.67rem)]">
                    <div className="p-2">
                        Model {index + 1}:{" "}
                        <select className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" defaultValue="">
                            <option value="" disabled hidden>Select a model...</option>
                            {models.map((model) => (
                                <option key={model.value} value={model.value}>
                                    {model.label}
                                </option>
                            ))}
                        </select>
                        <div className="mt-2 w-full">
                            <textarea
                                className="w-full p-2 border border-gray-300 rounded resize-none focus:outline-none"
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