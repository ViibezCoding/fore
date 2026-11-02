// Saved progress. It's versioned so later updates can read older saves, and
// storage can be blocked or empty, so every read and write is guarded.

const SAVE_KEY = 'fore.save';
const SAVE_VERSION = 1;

export interface Save {
  longestYards: number;
  tees: number;
  /** Best Long Drive Competition score. */
  bestRoundYards: number;
  mostMonsters: number;
}

const EMPTY_SAVE: Save = { longestYards: 0, tees: 0, bestRoundYards: 0, mostMonsters: 0 };

export function loadSave(): Save {
  try {
    return { ...EMPTY_SAVE, ...JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}') };
  } catch {
    return { ...EMPTY_SAVE };
  }
}

export function writeSave(save: Save): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, ...save }));
  } catch {
    // Not saved, but the game still tracks it until the page closes.
  }
}
