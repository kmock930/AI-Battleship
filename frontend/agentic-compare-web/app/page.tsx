"use client";

import React from "react";
import { useState } from "react";
import PromptArea from "./components/PromptArea";
import ModelOutputArea from "./components/ModelOutputArea";

export default function Home() {
  const [numModels, setNumModels] = useState(2);

  const handleAddModel = () => {
    setNumModels(numModels + 1);
  }

  return (
    <>
      <PromptArea handleAddModel={handleAddModel} />
      <ModelOutputArea numModels={numModels} />
    </>
  );
}
