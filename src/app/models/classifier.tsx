"use client";

import * as React from "react";
import { useEffect, useState, useRef, ChangeEvent } from "react";
import { pipeline, TextClassificationPipeline, TextClassificationSingle } from "@huggingface/transformers";

interface ClassificationResult {
  label: string;
  score: number;
}

export default function Classifier(): React.ReactNode {
  const [text, setText] = useState<string>("I love Transformers.js!");
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const ref = useRef<Promise<TextClassificationPipeline> | null>(null);

  useEffect(() => {
    if (!ref.current) {
      ref.current = pipeline("text-classification", "Xenova/distilbert-base-uncased-finetuned-sst-2-english") as unknown as Promise<TextClassificationPipeline>;
    }
  }, []);

  useEffect(() => {
    if (ref.current) {
      ref.current.then(async (classifier) => {
        const classificationResult = await classifier(text);
        const singleResult = classificationResult[0] as TextClassificationSingle;
        setResult({
          label: singleResult.label,
          score: singleResult.score
        });
      });
    }
  }, [text]);

  return (
    <div>
      <input
        type="text"
        value={text}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
        className="border border-gray-300 rounded p-2 dark:bg-black dark:text-white w-full"
      />

      <pre className="border border-gray-300 rounded p-2 dark:bg-black dark:text-white w-full min-h-[120px]">
        {result ? JSON.stringify(result, null, 2) : "Loading…"}
      </pre>
    </div>
  );
}