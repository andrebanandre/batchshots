import React, { useState, useEffect } from "react";
import Card from "./Card";
import Loader from "./Loader";

interface ModelLoadingCardProps {
  title: string;
  description?: string;
  isLoading: boolean;
  isReady: boolean;
  loadingStatus?: string;
  progress?: number;
  error?: string;
  className?: string;
  onRetry?: () => void;
  variant?: "default" | "minimal";
}

export default function ModelLoadingCard({
  title,
  description,
  isLoading,
  isReady,
  loadingStatus,
  progress,
  error,
  className = "",
  onRetry,
  variant = "default",
}: ModelLoadingCardProps) {
  const [currentProgress, setCurrentProgress] = useState(0);

  useEffect(() => {
    if (progress !== undefined) {
      setCurrentProgress(progress);
    } else if (isLoading) {
      // Simulate progress if not provided
      const interval = setInterval(() => {
        setCurrentProgress((prev) => {
          if (prev >= 90) return prev; // Don't go over 90% until actually done
          return prev + Math.random() * 10;
        });
      }, 500);

      return () => clearInterval(interval);
    } else if (isReady) {
      setCurrentProgress(100);
    } else {
      setCurrentProgress(0);
    }
  }, [isLoading, isReady, progress]);

  const renderContent = () => {
    if (error) {
      return (
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">❌ Loading Failed</div>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      );
    }

    if (isReady) {
      return (
        <div className="text-center py-8">
          <div className="text-green-500 mb-2">✅ Ready</div>
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
      );
    }

    return (
      <div className="text-center py-8">
        <div className="flex justify-center mb-4">
          <Loader size="lg" />
        </div>
        <div className="text-lg font-medium mb-2">
          {isLoading ? "Loading..." : "Initializing..."}
        </div>
        {loadingStatus && (
          <p className="text-sm text-gray-600 mb-4">{loadingStatus}</p>
        )}
        {description && !loadingStatus && (
          <p className="text-sm text-gray-600 mb-4">{description}</p>
        )}

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${currentProgress}%` }}
          />
        </div>
        <div className="text-sm text-gray-500">
          {Math.round(currentProgress)}% Complete
        </div>
      </div>
    );
  };

  if (variant === "minimal") {
    return (
      <div className={`brutalist-border p-4 text-center bg-white ${className}`}>
        {renderContent()}
      </div>
    );
  }

  return (
    <Card title={title} className={className}>
      <div className="space-y-4">{renderContent()}</div>
    </Card>
  );
}
