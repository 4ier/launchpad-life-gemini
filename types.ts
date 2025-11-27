
export type GridState = boolean[][];

export interface Coord {
  x: number;
  y: number;
}

export enum CellColor {
  Green = 'green',
  Red = 'red',
  Amber = 'amber',
  Yellow = 'yellow',
  Cyan = 'cyan',
  Purple = 'purple',
  Pink = 'pink',
  Blue = 'blue',
  White = 'white',
}

export interface Preset {
  name: string;
  pattern: Coord[];
}

export enum InstrumentType {
  Drums = 'drums',
  Bass = 'bass',
  Guitar = 'guitar',
  Orchestra = 'orchestra',
  Synth = 'synth',
  Piano = 'piano',
  Marimba = 'marimba',
  Glitch = 'glitch',
}

export interface InstrumentConfig {
  type: InstrumentType;
  name: string;
  color: CellColor;
}

export interface InstrumentSettings {
  bpm: number;
  distortion: number; // 0 to 1
  reverb: number; // 0 to 1
  volume: number; // 0 to 1
}
