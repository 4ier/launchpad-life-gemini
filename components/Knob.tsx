import React, { useState, useEffect, useRef } from 'react';

interface KnobProps {
  value: number; // 0 to 1
  onChange: (value: number) => void;
  label: string;
  min?: number;
  max?: number;
  color?: string;
}

export const Knob: React.FC<KnobProps> = ({ value, onChange, label, min = 0, max = 1, color = 'text-blue-500' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef<number>(0);
  const startVal = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startY.current = e.clientY;
    startVal.current = value;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaY = startY.current - e.clientY;
      const range = max - min;
      // Sensitivity: 200px drag = full range
      const deltaVal = (deltaY / 200) * range;
      let newVal = startVal.current + deltaVal;
      newVal = Math.max(min, Math.min(max, newVal));
      onChange(newVal);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, max, min, onChange]);

  // Rotation: 0% = -135deg, 100% = 135deg
  const percentage = (value - min) / (max - min);
  const rotation = -135 + (percentage * 270);

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div 
        className="relative w-10 h-10 rounded-full bg-[#1a1a1a] shadow-[0_2px_5px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] border border-neutral-800 cursor-ns-resize"
        onMouseDown={handleMouseDown}
      >
        <div 
          className="absolute top-0 left-0 w-full h-full"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
             <div className={`absolute top-1 left-1/2 -translate-x-1/2 w-1 h-2 rounded-full ${isDragging ? 'bg-white' : 'bg-gray-400'}`}></div>
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase text-gray-500">{label}</span>
    </div>
  );
};
