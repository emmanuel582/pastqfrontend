export type ScholarState = 'idle' | 'study' | 'thinking' | 'waiting' | 'celebrate' | 'encourage';
export type ScholarFrame = { row: number; frame: number; hold: number; action: string };

function frames(action: string, row: number, holds: number[]): ScholarFrame[] {
  return holds.map((hold, frame) => ({ action, row, frame, hold }));
}

// Each gesture plays once. Long rests and a held smile give Scholar room to breathe.
export function scholarMotion(state: ScholarState, turn: number): ScholarFrame[] {
  if (state === 'celebrate') return frames('celebrate', 4, [450, 450, 550, 450, 2200]);
  if (turn % 2 === 0 || state === 'idle') return frames('idle', 0, [2600, 1200, 1100, 220, 1000, 1100, 2000]);
  if (state === 'waiting') return frames('waiting', 6, [900, 1100, 1200, 1100, 1300, 2400]);
  if (state === 'encourage') return frames('encourage', 5, [700, 700, 800, 700, 850, 1200, 1000, 2400]);
  // A small wave every third gesture; reading and reflection alternate between rests.
  if (turn % 6 === 5) return frames('wave', 3, [700, 850, 1200, 1900]);
  if (state === 'thinking' || turn % 4 === 3) return frames('thinking', 7, [900, 1200, 1000, 1300, 1100, 2400]);
  return frames('study', 8, [850, 1200, 1100, 1300, 1100, 2600]);
}
