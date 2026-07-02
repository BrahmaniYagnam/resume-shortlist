import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  label?: string;
  color?: string;
  className?: string;
}

export function ProgressBar({ value, label, color = "bg-blue-600", className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">{label}</span>
          <span className="font-medium text-gray-900 dark:text-white">{clamped.toFixed(0)}%</span>
        </div>
      )}
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", color)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
