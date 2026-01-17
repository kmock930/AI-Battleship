"use client";

import { useEffect, useState } from "react";
import { CircularProgress, Grid } from "@mui/material";
import { Model } from "../lib/api";

import { getModelEvaluationResults } from "../lib/api";

export default function ModelEvalArea({models}: {models: Model[]}) {
  
  const [evaluationResults, setEvaluationResults] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    async function fetchEvaluationResults() {
      const results = await getModelEvaluationResults(models);
      setEvaluationResults(results);
    }

    if (models.length > 0) {
      fetchEvaluationResults();
    }
  }, [models]);

  return (
    <Grid>
        <h3 className="text-xl font-semibold p-4">
            Model Evaluation
        </h3>
        {models.length === 0 ? (
            <p className="p-4">No models selected for evaluation.</p>
        ) : (
            <div className="p-4">
                {evaluationResults == null ? (
                    <CircularProgress />
                ) : (
                    <div className="flex flex-wrap gap-4 max-h-[600px] overflow-y-auto">
                        {evaluationResults.bestModel !== undefined && (
                            <div className="mb-2 min-w-[250px]">
                                <strong>Best Model:</strong>{" "}
                                {evaluationResults.bestModel ? (
                                    <b className="text-blue-600">{String(evaluationResults.bestModel)}</b>
                                ) : (
                                    <span className="text-gray-500">Unable to Identify</span>
                                )}
                            </div>
                        )}
                        {Object.entries(evaluationResults)
                            .filter(([key]) => key !== "bestModel")
                            .map(([key, value]: [string, any]) => (
                            <div key={key} className="mb-2 min-w-[250px]">
                                <strong>{key}:</strong>{" "}
                                {typeof value === 'object' && value !== null ? (
                                    <div style={{ marginLeft: '1em' }}>
                                        {Object.entries(value).map(([subKey, subValue]: [string, any]) => (
                                            <div key={subKey}>
                                                {subKey}: {String(subValue)}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    String(value)
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
    </Grid>
  );
}