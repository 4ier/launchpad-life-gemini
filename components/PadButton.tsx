
import React from 'react';
import { CellColor, COLOR_MAP } from '../constants';

interface PadButtonProps {
  isActive?: boolean;
  color: CellColor;
  onClick: () => void;
  onMouseEnter?: () => void;
  isCircle?: boolean;
  icon?: React.ReactNode;
  pulse?: boolean;
  className?: string;
  label?: string;
  isScanned?: boolean;
}

export const PadButton: React.FC<PadButtonProps> = ({ 
  isActive, 
  color, 
  onClick, 
  onMouseEnter,
  isCircle = false, 
  icon,
  pulse = false,
  className = "",
  label,
  isScanned = false,
}) => {
  const colorConfig = COLOR_MAP[color];

  const baseClasses = `
    relative
    flex items-center justify-center
    transition-all duration-75 ease-out
    transform
    overflow-hidden
    select-none
    ${isCircle ? '' : 'rounded-sm'} 
  `;

  const cursorClass = "cursor-pointer";

  const shapeClasses = isCircle 
    ? "rounded-full w-8 h-8 sm:w-10 sm:h-10" 
    : "w-full h-full aspect-square";

  let colorClasses = "";
  let shadowClasses = "";

  // Visual states
  if (isActive) {
    colorClasses = `${colorConfig.activeClass} brightness-110`;
    shadowClasses = colorConfig.shadow;
    
    // When scanned and active: EXTRA bright with ring
    if (isScanned) {
        colorClasses = `${colorConfig.activeClass} brightness-200 saturate-150 ring-2 ring-white/80 scale-95 z-10`;
        shadowClasses = `shadow-[0_0_20px_4px_rgba(255,255,255,0.9)]`;
    }
  } else {
    // Inactive state
    if (isScanned) {
        // Scanned bar visibility - make it bright enough to see
        colorClasses = "bg-white/30 border border-white/60 z-10";
        shadowClasses = "shadow-[0_0_8px_rgba(255,255,255,0.4)]";
    } else {
        // Default idle
        colorClasses = "bg-[#252525] hover:bg-[#333] border border-white/5";
        shadowClasses = "shadow-none";
    }
  }

  const pulseClass = pulse && isActive ? 'animate-pulse' : '';

  return (
    <button
      onMouseDown={onClick}
      onMouseEnter={onMouseEnter}
      className={`
        ${baseClasses} 
        ${shapeClasses} 
        ${colorClasses} 
        ${shadowClasses}
        ${pulseClass}
        ${cursorClass}
        ${className}
      `}
      title={label}
      aria-label={label || 'Launchpad button'}
    >
      {icon && (
        <div className={`relative z-10 ${isActive ? 'text-black' : 'text-gray-500'} transition-colors duration-200`}>
          {icon}
        </div>
      )}
    </button>
  );
};
