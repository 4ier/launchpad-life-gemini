
import React, { useEffect, useRef, useState } from 'react';
import { Square, Shuffle, Globe, Trash2, Sliders, Play, Pause } from 'lucide-react';
import { PadButton } from './PadButton';
import { Knob } from './Knob';
import { CellColor, PRESETS, GRID_SIZE, MIN_BPM, MAX_BPM } from '../constants';
import { InstrumentConfig, InstrumentType, GridState, Preset, InstrumentSettings } from '../types';
import { AudioChannel } from '../utils/audio';

interface LaunchpadProps {
  id: number;
  config: InstrumentConfig;
  bpm: number;
  currentCol: number;
  grid: GridState;
  wrapAround: boolean;
  isPlaying: boolean; // From props now
  onTogglePlay: () => void;
  onBpmChange: (next: number) => void;
  onToggleCell: (x: number, y: number) => void;
  onSetCell: (x: number, y: number, state: boolean) => void;
  onRandomize: () => void;
  onClear: () => void;
  onToggleWrap: () => void;
  onLoadPreset: (preset: Preset) => void;
  onStep: () => void;
  onRemove: () => void;
}

export const Launchpad: React.FC<LaunchpadProps> = ({
  id,
  config,
  bpm,
  currentCol,
  grid,
  wrapAround,
  isPlaying,
  onTogglePlay,
  onBpmChange,
  onToggleCell,
  onSetCell,
  onRandomize,
  onClear,
  onToggleWrap,
  onLoadPreset,
  onStep,
  onRemove
}) => {
  // Local Audio Channel
  const audioChannelRef = useRef<AudioChannel | null>(null);
  const gridRef = useRef<GridState>(grid);
  
  // Local UI State
  const [settings, setSettings] = useState<InstrumentSettings>({
    distortion: 0.0,
    reverb: 0.1,
    volume: 0.7
  });
  const [instrumentType, setInstrumentType] = useState<InstrumentType>(config.type);

  const prevColRef = useRef<number>(-1);
  
  // Painting State
  const isDrawingRef = useRef(false);
  const drawStateRef = useRef(true);

  // Initialize Audio Channel
  useEffect(() => {
    audioChannelRef.current = new AudioChannel(instrumentType);
    return () => {
      // cleanup if needed
    };
  }, []);

  // Update Audio Params
  useEffect(() => {
    if (audioChannelRef.current) {
        audioChannelRef.current.setFx(settings.distortion, settings.reverb, settings.volume);
        audioChannelRef.current.setType(instrumentType);
    }
  }, [settings, instrumentType]);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  // Respond to master transport ticks
  useEffect(() => {
    if (!audioChannelRef.current) return;
    if (!isPlaying) {
      prevColRef.current = currentCol;
      return;
    }
    if (currentCol < 0) return;

    audioChannelRef.current.playColumn(currentCol, gridRef.current);

    if (prevColRef.current === GRID_SIZE - 1 && currentCol === 0) {
      onStep();
    }

    prevColRef.current = currentCol;
  }, [currentCol, isPlaying, onStep]);


  // Painting Handlers
  const handleMouseDown = (x: number, y: number) => {
    isDrawingRef.current = true;
    const newState = !grid[y][x];
    drawStateRef.current = newState;
    onSetCell(x, y, newState);
  };

  const handleMouseEnter = (x: number, y: number) => {
    if (isDrawingRef.current) {
      onSetCell(x, y, drawStateRef.current);
    }
  };

  const handleMouseUp = () => {
    isDrawingRef.current = false;
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);


  return (
    <div className={`
      relative 
      bg-[#161616] 
      p-3 sm:p-4 rounded-[1.5rem] 
      shadow-[0_15px_40px_-10px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.08)]
      border-b-[6px] border-r-[6px] border-[#080808]
      flex flex-col gap-3 sm:gap-4
      h-full
      transition-all duration-300
      ${!isPlaying ? 'border-gray-800 opacity-90' : ''}
    `}>
      
      {/* Header */}
      <div className="flex justify-between items-center px-2 py-1 bg-[#0a0a0a] rounded-lg border border-white/5">
        <div className="flex flex-col">
            <select 
                value={instrumentType}
                onChange={(e) => setInstrumentType(e.target.value as InstrumentType)}
                className={`bg-transparent text-${config.color}-500 font-bold uppercase text-sm tracking-widest focus:outline-none cursor-pointer`}
            >
                {Object.values(InstrumentType).map(t => (
                    <option key={t} value={t}>{t}</option>
                ))}
            </select>
             <div className="text-[10px] text-gray-500 font-mono">CH-{id} / BPM {bpm}</div>
        </div>

        <div className="flex gap-1 sm:gap-2">
           <button onClick={onToggleWrap} className={`p-1.5 rounded transition-colors ${wrapAround ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-white'}`} title="Toroidal Wrap">
             <Globe size={14} />
           </button>
           <button onClick={onRandomize} className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/10" title="Randomize">
             <Shuffle size={14} />
           </button>
           <button onClick={onClear} className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/10" title="Clear">
             <Square size={14} fill="currentColor" />
           </button>
           <button onClick={onRemove} className="p-1.5 rounded text-red-900 hover:text-red-500 hover:bg-red-950 ml-2" title="Remove Device">
             <Trash2 size={14} />
           </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className={`flex-1 flex gap-2 sm:gap-4 min-h-0 transition-opacity duration-300 ${isPlaying ? 'opacity-100' : 'opacity-60'}`}>
        {/* Main 16x16 Grid */}
        <div 
            className="flex-1 grid grid-cols-[repeat(16,minmax(0,1fr))] gap-[1px] sm:gap-[2px] bg-[#0a0a0a] p-1 sm:p-2 rounded-xl border border-white/5 aspect-square"
            onMouseLeave={handleMouseUp}
        >
          {grid.map((row, y) => (
            row.map((isAlive, x) => (
              <PadButton
                key={`${x}-${y}`}
                color={config.color}
                isActive={isAlive}
                isScanned={isPlaying && x === currentCol}
                onClick={() => handleMouseDown(x, y)}
                onMouseEnter={() => handleMouseEnter(x, y)}
                className="" 
              />
            ))
          ))}
        </div>

        {/* Side Presets */}
        <div className="flex flex-col gap-1 sm:gap-2 w-8 sm:w-10 max-h-[320px] overflow-y-auto px-1 sm:px-2">
          {PRESETS.slice(1).map((preset, index) => (
            <PadButton
              key={preset.name}
              color={CellColor.White}
              isActive={false}
              isCircle
              onClick={() => onLoadPreset(preset)}
              label={`Load ${preset.name}`}
              className="!w-7 !h-7 sm:!w-9 sm:!h-9 text-[8px] sm:text-[10px] font-bold text-black"
              icon={<span>{index + 1}</span>}
            />
          ))}
        </div>
      </div>
      
      {/* Control Panel (Footer) */}
      <div className="grid grid-cols-[auto_1fr_auto] gap-2 sm:gap-4 bg-[#0a0a0a] p-2 sm:p-3 rounded-xl border border-white/5 items-center">
         
         {/* Play/Pause Button */}
         <button 
            onClick={onTogglePlay}
            className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-[0_2px_5px_rgba(0,0,0,0.5)]
                ${isPlaying 
                    ? `bg-${config.color}-600 text-white shadow-[0_0_15px_${config.color}]` 
                    : 'bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#222]'}
            `}
         >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
         </button>

         {/* BPM Slider */}
         <div className="flex flex-col justify-center gap-1 px-1 sm:px-2">
            <div className="flex justify-between text-[10px] text-gray-500 uppercase font-bold">
                <span>Tempo</span>
                <span>{Math.round(bpm)}</span>
            </div>
            <input 
                type="range" 
                min={MIN_BPM} 
                max={MAX_BPM} 
                value={bpm} 
                onChange={(e) => onBpmChange(Number(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
         </div>

         {/* FX Knobs */}
         <div className="flex gap-2 sm:gap-4 px-2 border-l border-white/10">
            <Knob 
                label="Dist" 
                value={settings.distortion} 
                onChange={(v) => setSettings({...settings, distortion: v})} 
            />
            <Knob 
                label="Verb" 
                value={settings.reverb} 
                onChange={(v) => setSettings({...settings, reverb: v})} 
            />
             <Knob 
                label="Vol" 
                value={settings.volume} 
                onChange={(v) => setSettings({...settings, volume: v})} 
            />
         </div>
      </div>

    </div>
  );
};
