
import { InstrumentType, GridState } from '../types';
import { GRID_SIZE } from '../constants';

// Pentatonic scales and mappings
const SCALES = {
  [InstrumentType.Bass]: [32.70, 36.71, 41.20, 49.00, 55.00, 65.41, 73.42, 82.41, 98.00, 110.00, 130.81, 146.83, 164.81, 196.00, 220.00, 261.63],
  [InstrumentType.Guitar]: [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50],
  [InstrumentType.Orchestra]: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51, 1567.98, 1760.00, 2093.00],
  [InstrumentType.Synth]: [65.41, 73.42, 82.41, 98.00, 110.00, 130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25],
  [InstrumentType.Piano]: [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50],
  [InstrumentType.Marimba]: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51, 1567.98, 1760.00, 2093.00],
  [InstrumentType.Glitch]: [], // Calculated procedurally
  [InstrumentType.Drums]: [] // Mapped by index
};

// Singleton context
let audioCtx: AudioContext | null = null;
let reverbBuffer: AudioBuffer | null = null;

export const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

export const resumeAudio = () => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        return ctx.resume();
    }
    return Promise.resolve();
};

// Generate a simple impulse response for reverb
const getReverbBuffer = () => {
  if (reverbBuffer) return reverbBuffer;
  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * 2.0; // 2 seconds
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);
  for (let i = 0; i < length; i++) {
    const decay = Math.pow(1 - i / length, 2);
    left[i] = (Math.random() * 2 - 1) * decay;
    right[i] = (Math.random() * 2 - 1) * decay;
  }
  reverbBuffer = impulse;
  return impulse;
};

export class AudioChannel {
  private type: InstrumentType;
  private volume: GainNode;
  private distNode: WaveShaperNode;
  private reverbNode: ConvolverNode;
  private reverbGain: GainNode;
  private masterGain: GainNode;

  constructor(type: InstrumentType) {
    const ctx = getAudioContext();
    this.type = type;

    // Master Volume for this channel
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.5;

    // Effects Chain
    this.distNode = ctx.createWaveShaper();
    this.distNode.curve = this.makeDistortionCurve(0);
    this.distNode.oversample = '4x';

    this.reverbNode = ctx.createConvolver();
    this.reverbNode.buffer = getReverbBuffer();
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.value = 0;

    // Dry path
    this.volume = ctx.createGain();

    // Wiring: Source -> Distortion -> (Dry + Reverb) -> Master -> Destination
    this.distNode.connect(this.volume);
    
    this.volume.connect(this.masterGain);
    
    this.volume.connect(this.reverbGain);
    this.reverbGain.connect(this.reverbNode);
    this.reverbNode.connect(this.masterGain);

    this.masterGain.connect(ctx.destination);
  }

  setFx(distortionAmount: number, reverbAmount: number, volume: number) {
    this.distNode.curve = this.makeDistortionCurve(distortionAmount * 400);
    this.reverbGain.gain.value = reverbAmount;
    this.masterGain.gain.value = volume;
  }

  setType(type: InstrumentType) {
    this.type = type;
  }

  playColumn(colIndex: number, grid: GridState) {
    const ctx = getAudioContext();
    // Safety resume check, though main app handles this too
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    
    const now = ctx.currentTime;
    
    // Scan the column (y-axis)
    for (let y = 0; y < GRID_SIZE; y++) {
      if (grid[y][colIndex]) {
        // Invert Y for pitch (bottom low, top high)
        const pitchIndex = (GRID_SIZE - 1) - y;
        this.playVoice(pitchIndex, now);
      }
    }
  }

  private playVoice(index: number, time: number) {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Connect to effects chain start
    osc.connect(gain);
    gain.connect(this.distNode);

    if (this.type === InstrumentType.Drums) {
        this.synthesizeDrum(index, time, osc, gain);
    } else {
        this.synthesizeNote(index, time, osc, gain);
    }
  }

  private synthesizeNote(index: number, time: number, osc: OscillatorNode, gain: GainNode) {
    const rawScale = SCALES[this.type];
    const scales = rawScale && rawScale.length ? rawScale : SCALES[InstrumentType.Piano];
    const freq = scales.length ? scales[index % scales.length] : 220;
    const safeFreq = Number.isFinite(freq) ? freq : 220;
    
    // Glitch uses random frequency modulation
    if (this.type === InstrumentType.Glitch) {
        osc.frequency.setValueAtTime(safeFreq * (0.5 + Math.random()), time);
        osc.frequency.linearRampToValueAtTime(safeFreq, time + 0.1);
    } else {
        osc.frequency.setValueAtTime(safeFreq, time);
    }

    switch (this.type) {
      case InstrumentType.Bass:
        osc.type = 'sawtooth';
        // Plucky envelope
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.8, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
        
        // Lowpass filter for bass
        const bFilter = getAudioContext().createBiquadFilter();
        bFilter.type = 'lowpass';
        bFilter.frequency.setValueAtTime(800, time);
        bFilter.frequency.exponentialRampToValueAtTime(100, time + 0.3);
        
        osc.disconnect();
        osc.connect(bFilter);
        bFilter.connect(gain);
        
        osc.start(time);
        osc.stop(time + 0.4);
        break;
      
      case InstrumentType.Guitar:
        osc.type = 'square';
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.5, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
        osc.start(time);
        osc.stop(time + 0.6);
        break;

      case InstrumentType.Orchestra:
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.3, time + 0.2); // Slow attack
        gain.gain.linearRampToValueAtTime(0, time + 1.2);
        osc.start(time);
        osc.stop(time + 1.5);
        break;

      case InstrumentType.Synth:
        osc.type = 'sawtooth';
        // Lowpass filter for synth feel
        const filter = getAudioContext().createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 2, time);
        filter.frequency.exponentialRampToValueAtTime(freq * 8, time + 0.1);
        filter.frequency.exponentialRampToValueAtTime(freq * 2, time + 0.4);
        
        // Rewire for filter: Osc -> Filter -> Gain -> FX
        osc.disconnect();
        osc.connect(filter);
        filter.connect(gain);

        gain.gain.setValueAtTime(0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
        osc.start(time);
        osc.stop(time + 0.4);
        break;

      case InstrumentType.Piano:
        osc.type = 'triangle';
        // Sharp attack
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.7, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
        
        osc.start(time);
        osc.stop(time + 0.8);
        break;

      case InstrumentType.Marimba:
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.8, time + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
        osc.start(time);
        osc.stop(time + 0.3);
        break;

      case InstrumentType.Glitch:
        osc.type = 'square';
        gain.gain.setValueAtTime(0.6, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        osc.start(time);
        osc.stop(time + 0.1);
        break;
    }
  }

  private synthesizeDrum(index: number, time: number, osc: OscillatorNode, gain: GainNode) {
     if (index < 4) { // Kick
       osc.frequency.setValueAtTime(150, time);
       osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
       gain.gain.setValueAtTime(1, time);
       gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
       osc.start(time);
       osc.stop(time + 0.5);
     } else if (index < 8) { // Snare
       osc.type = 'triangle';
       osc.frequency.setValueAtTime(250, time);
       gain.gain.setValueAtTime(0.7, time);
       gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
       osc.start(time);
       osc.stop(time + 0.2);
       this.makeNoise(time, 0.2, 0.5);
     } else if (index < 12) { // Closed Hat
       this.makeNoise(time, 0.05, 0.3, 8000);
     } else { // Open Hat
       this.makeNoise(time, 0.15, 0.3, 6000);
     }
  }

  private makeNoise(time: number, duration: number, vol: number, filterFreq = 1000) {
    const ctx = getAudioContext();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = filterFreq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.distNode);
    noise.start(time);
  }

  private makeDistortionCurve(amount: number) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }
}
