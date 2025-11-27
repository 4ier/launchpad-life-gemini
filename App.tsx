
import React, { useState, useEffect } from 'react';
import { Launchpad } from './components/Launchpad';
import { useGameEngine } from './hooks/useGameEngine';
import { Plus, Play, Pause, Share2 } from 'lucide-react';
import { CellColor, DEFAULT_BPM, GRID_SIZE } from './constants';
import { InstrumentConfig, InstrumentType } from './types';
import { getAudioContext, resumeAudio } from './utils/audio';
import { decodeShare, encodeShare } from './utils/share';

type InstanceState = {
  id: number;
  config: InstrumentConfig;
  seed: number;
};

const COLORS = [CellColor.Red, CellColor.Purple, CellColor.Cyan, CellColor.Amber, CellColor.Green, CellColor.Pink];
const TYPES = Object.values(InstrumentType);
const makeSeed = () => Math.floor(Math.random() * 0x3ff); // 10 bits for compact sharing

// Wrapper component to bind a hook instance to a Launchpad
const LaunchpadInstance = ({ 
    id, 
    config, 
    seed,
    bpm,
    currentCol,
    isPlaying,
    onTogglePlay,
    onBpmChange,
    onRemove,
    onSeedChange,
}: { 
    id: number, 
    config: InstrumentConfig, 
    seed: number;
    bpm: number;
    currentCol: number;
    isPlaying: boolean,
    onTogglePlay: () => void,
    onBpmChange: (next: number) => void,
    onRemove: () => void,
    onSeedChange: (seed: number) => void,
}) => {
  const engine = useGameEngine();
  
  React.useEffect(() => {
      engine.randomize(seed);
  }, [seed]);

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
      onRandomize={() => {
        const nextSeed = makeSeed();
        onSeedChange(nextSeed);
        engine.randomize(nextSeed);
      }}
      onClear={engine.clear}
      onToggleWrap={() => engine.setWrapAround(!engine.wrapAround)}
      onLoadPreset={engine.loadPreset}
      onStep={engine.nextStep}
      onRemove={onRemove}
    />
  );
};

function App() {
  const [instances, setInstances] = useState<InstanceState[]>([
    { id: 1, config: { type: InstrumentType.Drums, name: "Drums", color: CellColor.Red }, seed: makeSeed() },
    { id: 2, config: { type: InstrumentType.Bass, name: "Bass", color: CellColor.Purple }, seed: makeSeed() },
    { id: 3, config: { type: InstrumentType.Guitar, name: "Guitar", color: CellColor.Cyan }, seed: makeSeed() },
  ]);

  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [currentCol, setCurrentCol] = useState(-1);
  const [playbackStates, setPlaybackStates] = useState<Record<number, boolean>>({
    1: false, 2: false, 3: false
  });
  const lastStepRef = React.useRef<number | null>(null);
  const rafRef = React.useRef<number>(0);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

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

  // Load shared state from URL (if any)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('s');
    if (!code) return;

    const decoded = decodeShare(code);
    if (!decoded) return;

    const nextInstances: InstanceState[] = decoded.instances.map((inst, idx) => ({
      id: idx + 1,
      config: { type: inst.type, name: `Inst ${idx + 1}`, color: COLORS[idx % COLORS.length] },
      seed: inst.seed,
    }));

    if (nextInstances.length > 0) {
      setInstances(nextInstances);
      setPlaybackStates(nextInstances.reduce((acc, inst) => ({ ...acc, [inst.id]: false }), {}));
    }
    setBpm(decoded.bpm);
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
    setInstances([...instances, {
        id: nextId,
        config: {
            type: TYPES[nextId % TYPES.length],
            name: `Inst ${nextId}`,
            color: COLORS[nextId % COLORS.length]
        },
        seed: makeSeed(),
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
                    onClick={() => {
                      try {
                        const code = encodeShare(bpm, instances.map(i => ({ type: i.config.type, seed: i.seed })));
                        const url = new URL(window.location.href);
                        url.searchParams.set('s', code);
                        const link = url.toString();
                        if (navigator?.clipboard?.writeText) {
                          navigator.clipboard.writeText(link).then(() => setShareStatus('已复制分享链接'));
                        } else {
                          setShareStatus(link);
                        }
                      } catch (e) {
                        setShareStatus('分享生成失败');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
                    title="复制分享链接"
                 >
                    <Share2 size={14} /> Share
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

      {shareStatus && (
        <div className="mt-3 text-xs text-center text-emerald-400 px-4">
          {shareStatus}
        </div>
      )}

      {/* Main Workspace */}
      <main className="w-full max-w-[1920px] p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 place-items-start">
        {instances.map((inst) => (
            <div key={inst.id} className="w-full max-w-[800px] mx-auto">
                <LaunchpadInstance 
                    id={inst.id}
                    config={inst.config}
                    seed={inst.seed}
                    bpm={bpm}
                    currentCol={currentCol}
                    isPlaying={playbackStates[inst.id] ?? false}
                    onTogglePlay={() => togglePlayback(inst.id)}
                    onBpmChange={setBpm}
                    onRemove={() => removeLaunchpad(inst.id)}
                    onSeedChange={(seed) => setInstances(prev => prev.map(p => p.id === inst.id ? { ...p, seed } : p))}
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
