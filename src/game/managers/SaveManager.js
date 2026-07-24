const SAVE_KEY = 'skeleton-kingdom-save-v1';

const DEFAULT_SAVE = {
  currentLevel: 'level1',
  checkpoint: null, // { x, y } within current level
  coins: 0,
  gems: 0,
  maxHearts: 5,
  hearts: 5,
  skillPoints: 0,
  unlockedSkills: [],
  unlockedLevels: ['level1'],
  settings: {
    musicVolume: 0.25,
    sfxVolume: 0.6,
    muted: false
  },
  updatedAt: null
};

class SaveManagerClass {
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return { ...DEFAULT_SAVE };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SAVE, ...parsed };
    } catch (e) {
      console.warn('Save data corrupted, resetting.', e);
      return { ...DEFAULT_SAVE };
    }
  }

  save(partial) {
    const current = this.load();
    const updated = { ...current, ...partial, updatedAt: Date.now() };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Unable to write save data.', e);
    }
    return updated;
  }

  hasSave() {
    return !!localStorage.getItem(SAVE_KEY);
  }

  clear() {
    localStorage.removeItem(SAVE_KEY);
  }

  saveCheckpoint(level, x, y, extra = {}) {
    return this.save({ currentLevel: level, checkpoint: { x, y }, ...extra });
  }

  unlockLevel(levelKey) {
    const current = this.load();
    const unlocked = current.unlockedLevels || ['level1'];
    if (!unlocked.includes(levelKey)) unlocked.push(levelKey);
    return this.save({ unlockedLevels: unlocked });
  }

  isLevelUnlocked(levelKey) {
    const current = this.load();
    return (current.unlockedLevels || ['level1']).includes(levelKey);
  }
}

export const SaveManager = new SaveManagerClass();
export { DEFAULT_SAVE };
