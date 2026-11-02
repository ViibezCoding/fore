// Saved progress. It's versioned so later updates can read older saves, and
// storage can be blocked or empty, so every read and write is guarded.

const SAVE_KEY = 'fore.save';
const SAVE_VERSION = 1;

export function loadLongestDrive(): number {
  try {
    const save = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}');
    return typeof save.longestYards === 'number' ? save.longestYards : 0;
  } catch {
    return 0;
  }
}

export function saveLongestDrive(longestYards: number): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, longestYards }));
  } catch {
    // Not saved, but the game still tracks it until the page closes.
  }
}
