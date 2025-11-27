import { useState, useCallback } from 'react';
import { GRID_SIZE } from '../constants';
import { GridState, Preset } from '../types';

const createEmptyGrid = (): GridState => {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
};

// Deterministic PRNG for reproducible randomization (Mulberry32)
const createRng = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

export const useGameEngine = () => {
  const [grid, setGrid] = useState<GridState>(createEmptyGrid());
  const [generation, setGeneration] = useState(0);
  const [wrapAround, setWrapAround] = useState(true);

  const toggleCell = (x: number, y: number) => {
    setGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      newGrid[y][x] = !newGrid[y][x];
      return newGrid;
    });
  };

  // For painting: ensures we don't toggle back and forth while dragging over same cell
  const setCell = (x: number, y: number, state: boolean) => {
    setGrid(prev => {
        if (prev[y][x] === state) return prev;
        const newGrid = prev.map(row => [...row]);
        newGrid[y][x] = state;
        return newGrid;
    });
  };

  const loadPreset = (preset: Preset) => {
    const newGrid = createEmptyGrid();
    const offsetX = Math.floor(GRID_SIZE / 2) - 1; 
    const offsetY = Math.floor(GRID_SIZE / 2) - 1;

    preset.pattern.forEach(p => {
      const targetX = (p.x + offsetX) % GRID_SIZE;
      const targetY = (p.y + offsetY) % GRID_SIZE;
      if (targetY >= 0 && targetY < GRID_SIZE && targetX >= 0 && targetX < GRID_SIZE) {
        newGrid[targetY][targetX] = true;
      }
    });
    setGrid(newGrid);
    setGeneration(0);
  };

  const randomizeWithSeed = (seed?: number) => {
    const rng = seed === undefined ? Math.random : createRng(seed);
    const newGrid = createEmptyGrid().map(row =>
      row.map(() => rng() > 0.7)
    );
    setGrid(newGrid);
    setGeneration(0);
  };

  const clear = () => {
    setGrid(createEmptyGrid());
    setGeneration(0);
  };

  const nextStep = useCallback(() => {
    setGrid(currentGrid => {
      const nextGrid = currentGrid.map((row, y) => {
        return row.map((alive, x) => {
          let neighbors = 0;
          
          for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
              if (i === 0 && j === 0) continue;
              
              let nx = x + j;
              let ny = y + i;

              if (wrapAround) {
                nx = (nx + GRID_SIZE) % GRID_SIZE;
                ny = (ny + GRID_SIZE) % GRID_SIZE;
              }

              if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                if (currentGrid[ny][nx]) {
                  neighbors++;
                }
              }
            }
          }

          if (alive) {
            return neighbors === 2 || neighbors === 3;
          } else {
            return neighbors === 3;
          }
        });
      });
      return nextGrid;
    });
    setGeneration(g => g + 1);
  }, [wrapAround]);

  return {
    grid,
    generation,
    wrapAround,
    setWrapAround,
    toggleCell,
    setCell,
    loadPreset,
    randomize: randomizeWithSeed,
    clear,
    nextStep
  };
};
