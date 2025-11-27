
import React, { useState, useEffect } from 'react';
import { Launchpad } from './components/Launchpad';
import { useGameEngine } from './hooks/useGameEngine';
import { Plus, Play, Pause } from 'lucide-react';
import { CellColor, DEFAULT_BPM, GRID_SIZE } from './constants';
import { InstrumentConfig, InstrumentType } from './types';
import { getAudioContext, resumeAudio } from './utils/audio';

// Wrapper component to bind a hook instance to a Launchpad
const LaunchpadInstance = ({ 
    id, 
    config, 
    bpm,
    currentCol,
    isPlaying,
    onTogglePlay,
    onBpmChange,
    onRemove 
}: { 
    id: number, 
    config: InstrumentConfig, 
    bpm: number;
    currentCol: number;
    isPlaying: boolean,
    onTogglePlay: () => void,
    onBpmChange: (next: number) => void,
    onRemove: () => void 
}) => {
  const engine = useGameEngine();
  
  React.useEffect(() => {
      engine.randomize();
  }, []);

  return (
    <Launchpad
      id={id}
      config={config}
      bpm={bpm}
      currentCol={currentCol}
      isPlaying={isPlaying}
      onTogglePlay={onTogglePlay}
      onBpmChange={onBpmChange}
      grid={engine.grid}
      wrapAround={engine.wrapAround}
      onToggleCell={engine.toggleCell}
      onSetCell={engine.setCell}
      onRandomize={engine.randomize}
      onClear={engine.clear}
      onToggleWrap={() => engine.setWrapAround(!engine.wrapAround)}
      onLoadPreset={engine.loadPreset}
      onStep={engine.nextStep}
      onRemove={onRemove}
    />
  );
};

function App() {
  const [instances, setInstances] = useState([
    { id: 1, config: { type: InstrumentType.Drums, name: "Drums", color: CellColor.Red } },
    { id: 2, config: { type: InstrumentType.Bass, name: "Bass", color: CellColor.Purple } },
    { id: 3, config: { type: InstrumentType.Guitar, name: "Guitar", color: CellColor.Cyan } },
  ]);

  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [currentCol, setCurrentCol] = useState(-1);
  const [playbackStates, setPlaybackStates] = useState<Record<number, boolean>>({
    1: false, 2: false, 3: false
  });
  const lastStepRef = React.useRef<number | null>(null);
  const rafRef = React.useRef<number>(0);

  // Auto-init audio on mount and interaction
  useEffect(() => {
    // Try to resume immediately (works in some envs)
    resumeAudio().catch(() => {});

    const handleInteraction = () => {
        resumeAudio().then(() => {
            // Once successfully resumed, we can stop listening
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
        }).catch(console.error);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    
    return () => {
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  // Master transport: single clock drives all launchpads for sync and performance
  useEffect(() => {
    lastStepRef.current = null;

    const loop = () => {
      if (!Object.values(playbackStates).some(Boolean)) return;

      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const stepDuration = 60 / bpm / 4;

      if (lastStepRef.current === null) {
        lastStepRef.current = now;
      }

      if (now - lastStepRef.current >= stepDuration) {
        setCurrentCol(prev => {
          const next = (prev + 1 + GRID_SIZE) % GRID_SIZE;
          return next;
        });
        lastStepRef.current = now;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playbackStates, bpm]);

  const togglePlayback = (id: number) => {
    setPlaybackStates(prev => {
        const nextState = !prev[id];
        if (nextState) resumeAudio().catch(() => {});
        return {
            ...prev,
            [id]: nextState
        };
    });
  };

  const isAnyPlaying = Object.values(playbackStates).some(s => s);
  
  const toggleMasterPlayback = () => {
      const newState = !isAnyPlaying;
      if (newState) resumeAudio().catch(() => {});
      const newStates = { ...playbackStates };
      instances.forEach(inst => {
          newStates[inst.id] = newState;
      });
      setPlaybackStates(newStates);
  };

  const addLaunchpad = () => {
    const nextId = Math.max(0, ...instances.map(i => i.id)) + 1;
    const colors = [CellColor.Red, CellColor.Purple, CellColor.Cyan, CellColor.Amber, CellColor.Green, CellColor.Pink];
    const types = Object.values(InstrumentType);
    
    setInstances([...instances, {
        id: nextId,
        config: {
            type: types[nextId % types.length],
            name: `Inst ${nextId}`,
            color: colors[nextId % colors.length]
        }
    }]);
    
    setPlaybackStates(prev => ({...prev, [nextId]: false}));
  };

  const removeLaunchpad = (id: number) => {
    setInstances(instances.filter(i => i.id !== id));
    setPlaybackStates(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col items-center">
      
      {/* Header */}
      <header className="w-full border-b border-white/5 bg-[#0a0a0a] sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
        <div className="max-w-[1920px] mx-auto px-6 py-4 flex justify-between items-center">
             <div className="flex items-center gap-4">
                <h1 className="text-2xl font-black tracking-tighter uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                    Launchpad Studio
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-mono text-gray-400 border border-white/5">
                    16x16 SEQ
                </span>
             </div>

             <div className="flex items-center gap-4">
                 <button
                    onClick={toggleMasterPlayback}
                    className={`
                        flex items-center justify-center w-10 h-10 rounded-full transition-all border
                        ${isAnyPlaying 
                            ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/20' 
                            : 'bg-green-500/10 text-green-500 border-green-500/50 hover:bg-green-500/20'}
                    `}
                    title={isAnyPlaying ? "Stop All" : "Play All"}
                 >
                    {isAnyPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                 </button>

                 <button 
                    onClick={addLaunchpad}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
                 >
                    <Plus size={14} /> Add
                 </button>
             </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="w-full max-w-[1920px] p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 place-items-start">
        {instances.map((inst) => (
            <div key={inst.id} className="w-full max-w-[800px] mx-auto">
                <LaunchpadInstance 
                    id={inst.id}
                    config={inst.config}
                    bpm={bpm}
                    currentCol={currentCol}
                    isPlaying={playbackStates[inst.id] ?? false}
                    onTogglePlay={() => togglePlayback(inst.id)}
                    onBpmChange={setBpm}
                    onRemove={() => removeLaunchpad(inst.id)}
                />
            </div>
        ))}
        
        {/* Add Button Placeholder - Only show if we have few instances or to fill grid */}
        <div 
           onClick={addLaunchpad}
           className="w-full max-w-[800px] aspect-square mx-auto border-2 border-dashed border-white/5 rounded-[1.5rem] flex flex-col items-center justify-center gap-4 text-gray-600 hover:text-gray-400 hover:border-white/10 hover:bg-white/[0.02] cursor-pointer transition-all"
        >
            <Plus size={48} />
            <span className="font-mono text-sm uppercase tracking-widest">Add Instrument</span>
        </div>
      </main>

    </div>
  );
}

export default App;
