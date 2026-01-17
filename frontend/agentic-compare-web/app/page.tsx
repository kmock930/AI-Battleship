"use client";

import React from "react";
import { useState } from "react";
import PromptArea from "./components/PromptArea";
import ModelOutputArea from "./components/ModelOutputArea";
import ModelEvalArea from "./components/ModelEvalArea";
import { Model } from "./lib/api";

export default function Home() {
  const [numModels, setNumModels] = useState(2);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

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

  // Filter out empty selections and get the actual selected models
  const actualSelectedModels = selectedModels
    .filter(value => value && value !== "") // show only non null values
    .map(value => models.find(m => m.value === value)) // find matching model's name from selection
    .filter((m): m is Model => m !== undefined); // filter out undefined values

  return (
    <>
      <PromptArea handleAddModel={handleAddModel} />
      <ModelOutputArea numModels={numModels} models={models} setModels={setModels} onModelSelect={handleModelSelection} />
      <ModelEvalArea models={actualSelectedModels} />
    </>
  );
}
