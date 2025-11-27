import { CellColor, Preset } from './types';

export { CellColor };

export const GRID_SIZE = 16;

export const DEFAULT_BPM = 120;
export const MIN_BPM = 60;
export const MAX_BPM = 240;

export const COLOR_MAP: Record<CellColor, { bg: string, shadow: string, activeClass: string }> = {
  [CellColor.Green]: { 
    bg: 'bg-green-600', 
    shadow: 'shadow-[0_0_10px_1px_rgba(34,197,94,0.5)]',
    activeClass: 'bg-green-400'
  },
  [CellColor.Red]: { 
    bg: 'bg-red-600', 
    shadow: 'shadow-[0_0_10px_1px_rgba(239,68,68,0.5)]',
    activeClass: 'bg-red-400'
  },
  [CellColor.Amber]: { 
    bg: 'bg-orange-600', 
    shadow: 'shadow-[0_0_10px_1px_rgba(249,115,22,0.5)]',
    activeClass: 'bg-orange-400'
  },
  [CellColor.Yellow]: { 
    bg: 'bg-yellow-500', 
    shadow: 'shadow-[0_0_10px_1px_rgba(250,204,21,0.5)]',
    activeClass: 'bg-yellow-300'
  },
  [CellColor.Cyan]: { 
    bg: 'bg-cyan-600', 
    shadow: 'shadow-[0_0_10px_1px_rgba(34,211,238,0.5)]',
    activeClass: 'bg-cyan-300'
  },
  [CellColor.Purple]: { 
    bg: 'bg-purple-600', 
    shadow: 'shadow-[0_0_10px_1px_rgba(168,85,247,0.5)]',
    activeClass: 'bg-purple-400'
  },
  [CellColor.Pink]: { 
    bg: 'bg-pink-600', 
    shadow: 'shadow-[0_0_10px_1px_rgba(236,72,153,0.5)]',
    activeClass: 'bg-pink-400'
  },
  [CellColor.Blue]: { 
    bg: 'bg-blue-600', 
    shadow: 'shadow-[0_0_10px_1px_rgba(59,130,246,0.5)]',
    activeClass: 'bg-blue-400'
  },
  [CellColor.White]: { 
    bg: 'bg-neutral-600', 
    shadow: 'shadow-[0_0_10px_1px_rgba(243,244,246,0.5)]',
    activeClass: 'bg-white'
  },
};

export const PRESETS: Preset[] = [
  {
    name: "Clear",
    pattern: []
  },
  {
    name: "Glider",
    pattern: [{x:1, y:0}, {x:2, y:1}, {x:0, y:2}, {x:1, y:2}, {x:2, y:2}]
  },
  {
    name: "Toad",
    pattern: [{x:1, y:1}, {x:2, y:1}, {x:3, y:1}, {x:0, y:2}, {x:1, y:2}, {x:2, y:2}]
  },
  {
    name: "Beacon",
    pattern: [{x:0, y:0}, {x:1, y:0}, {x:0, y:1}, {x:3, y:2}, {x:2, y:3}, {x:3, y:3}]
  },
  {
    name: "Pulsar",
    pattern: [
      {x:4,y:2},{x:5,y:2},{x:6,y:2},{x:10,y:2},{x:11,y:2},{x:12,y:2},
      {x:2,y:4},{x:7,y:4},{x:9,y:4},{x:14,y:4},
      {x:2,y:5},{x:7,y:5},{x:9,y:5},{x:14,y:5},
      {x:2,y:6},{x:7,y:6},{x:9,y:6},{x:14,y:6},
      {x:4,y:7},{x:5,y:7},{x:6,y:7},{x:10,y:7},{x:11,y:7},{x:12,y:7},
      {x:4,y:9},{x:5,y:9},{x:6,y:9},{x:10,y:9},{x:11,y:9},{x:12,y:9},
      {x:2,y:10},{x:7,y:10},{x:9,y:10},{x:14,y:10},
      {x:2,y:11},{x:7,y:11},{x:9,y:11},{x:14,y:11},
      {x:2,y:12},{x:7,y:12},{x:9,y:12},{x:14,y:12},
      {x:4,y:14},{x:5,y:14},{x:6,y:14},{x:10,y:14},{x:11,y:14},{x:12,y:14},
    ]
  },
  {
    name: "Spaceship",
    pattern: [{x:1, y:0}, {x:4, y:0}, {x:0, y:1}, {x:0, y:2}, {x:4, y:2}, {x:0, y:3}, {x:1, y:3}, {x:2, y:3}, {x:3, y:3}]
  },
];