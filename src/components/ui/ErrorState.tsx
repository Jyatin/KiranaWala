import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  secondaryAction?: React.ReactNode;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try Again",
  secondaryAction,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`rounded-[22px] border border-red-200 bg-red-50/60 p-5 sm:p-6 text-left space-y-3 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div className="space-y-1 flex-1">
          <h4 className="text-sm font-bold text-red-950">{title}</h4>
          <p className="text-xs text-red-800 leading-relaxed">{message}</p>
        </div>
      </div>

      {(onRetry || secondaryAction) && (
        <div className="flex flex-wrap items-center gap-2.5 pt-1 pl-8">
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              icon={<RefreshCw className="h-3 w-3" />}
              className="border-red-200 bg-white hover:bg-red-50 text-red-900"
            >
              {retryLabel}
            </Button>
          )}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
