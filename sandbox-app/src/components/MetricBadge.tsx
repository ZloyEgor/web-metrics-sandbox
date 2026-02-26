import { useState } from 'react';

interface MetricBadgeProps {
  label: string;
  value: number;
  unit?: string;
  description: string;
  // Thresholds for color coding
  good: number; // Green above this value
  fair: number; // Yellow above this value, red below
  inverse?: boolean; // If true, lower is better (e.g., load time)
}

export default function MetricBadge({
  label,
  value,
  unit = '',
  description,
  good,
  fair,
  inverse = false
}: MetricBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const getColor = () => {
    if (inverse) {
      // Lower is better (e.g., load time)
      if (value <= good) return 'bg-green-100 text-green-800 border-green-300';
      if (value <= fair) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      return 'bg-red-100 text-red-800 border-red-300';
    } else {
      // Higher is better (e.g., Lighthouse scores)
      if (value >= good) return 'bg-green-100 text-green-800 border-green-300';
      if (value >= fair) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  const getIcon = () => {
    const colorClass = getColor();
    if (colorClass.includes('green')) return '✓';
    if (colorClass.includes('yellow')) return '⚠';
    return '✗';
  };

  return (
    <div className="relative inline-block">
      <div
        className={`
          px-3 py-1.5 rounded-lg border-2 cursor-help transition-all
          ${getColor()}
          hover:shadow-md hover:scale-105
        `}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium opacity-70">{label}:</span>
          <span className="font-bold">
            {getIcon()} {value}{unit}
          </span>
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 w-64 p-3 mt-2 bg-gray-900 text-white text-sm rounded-lg shadow-xl left-1/2 transform -translate-x-1/2">
          <div className="font-semibold mb-1">{label}</div>
          <div className="text-xs text-gray-300">{description}</div>
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-gray-900"></div>
        </div>
      )}
    </div>
  );
}
