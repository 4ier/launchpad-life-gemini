import { InstrumentType } from '../types';

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const TYPE_TO_CODE: Record<InstrumentType, number> = {
  [InstrumentType.Drums]: 0,
  [InstrumentType.Bass]: 1,
  [InstrumentType.Guitar]: 2,
  [InstrumentType.Orchestra]: 3,
  [InstrumentType.Synth]: 4,
  [InstrumentType.Piano]: 5,
  [InstrumentType.Marimba]: 6,
  [InstrumentType.Glitch]: 7,
};
const CODE_TO_TYPE = Object.fromEntries(
  Object.entries(TYPE_TO_CODE).map(([k, v]) => [v, k as InstrumentType])
);

export interface ShareInstance {
  type: InstrumentType;
  seed: number;
}

const clampBpm = (val: number) => Math.min(200, Math.max(40, Math.round(val)));

const toChars = (value: bigint, length = 10) => {
  let num = value;
  let out = '';
  for (let i = 0; i < length; i++) {
    const idx = Number(num & 63n);
    out += CHARSET[idx];
    num >>= 6n;
  }
  return out;
};

const fromChars = (str: string) => {
  let value = 0n;
  for (let i = 0; i < str.length; i++) {
    const idx = CHARSET.indexOf(str[i]);
    if (idx < 0) return null;
    value |= BigInt(idx) << BigInt(6 * i);
  }
  return value;
};

// Layout (LSB first, total <= 60 bits => 10 chars base64url):
// 7 bits: bpm offset from 40 (range 40-200)
// 3 bits: instrument count (0-4)
// Per instrument (max 4): 3 bits type, 10 bits seed
export const encodeShare = (bpm: number, instances: ShareInstance[]) => {
  const count = Math.min(8, instances.length);
  const safeBpm = clampBpm(bpm);
  let bitsUsed = 0;
  let packed = 0n;

  const push = (val: number, bits: number) => {
    packed |= BigInt(val & ((1 << bits) - 1)) << BigInt(bitsUsed);
    bitsUsed += bits;
  };

  push(safeBpm - 40, 7);
  push(count, 4); // allow up to 8 devices

  for (let i = 0; i < count; i++) {
    const inst = instances[i];
    const typeCode = TYPE_TO_CODE[inst.type] ?? 0;
    const seed = inst.seed & 0x3ff; // 10 bits
    push(typeCode, 3);
    push(seed, 10);
  }

  const targetLength = count <= 4 ? 10 : Math.ceil(bitsUsed / 6);
  const targetBits = targetLength * 6;
  if (bitsUsed < targetBits) {
    packed |= 0n << BigInt(bitsUsed);
  }

  return toChars(packed, targetLength);
};

export const decodeShare = (code: string): { bpm: number; instances: ShareInstance[] } | null => {
  const value = fromChars(code);
  if (value === null) return null;
  let packed = value;

  const pull = (bits: number) => {
    const mask = (1n << BigInt(bits)) - 1n;
    const val = Number(packed & mask);
    packed >>= BigInt(bits);
    return val;
  };

  const bpmOffset = pull(7);
  const bpm = clampBpm(40 + bpmOffset);
  const count = Math.min(8, pull(4));
  const instances: ShareInstance[] = [];

  for (let i = 0; i < count; i++) {
    const typeCode = pull(3);
    const seed = pull(10);
    const type = (CODE_TO_TYPE as Record<number, InstrumentType>)[typeCode] ?? InstrumentType.Drums;
    instances.push({ type, seed });
  }

  return { bpm, instances };
};
