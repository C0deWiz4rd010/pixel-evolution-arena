import { describe, expect, it } from 'vitest';
import { AchievementMetrics, countClaimable, evaluateAchievements, findNewlyCompleted } from './achievements.rules';

const ZERO: AchievementMetrics = {
  battlesWon: 0,
  bestWinStreak: 0,
  unlockedCount: 0,
  stageMilestones: 0,
  criticalWins: 0,
  overdrivesUsed: 0,
  itemsUsed: 0,
  flawlessWins: 0,
  gauntletBestWave: 0,
};

describe('achievements rules', () => {
  it('marks an achievement complete when its metric reaches the goal', () => {
    const progress = evaluateAchievements({ ...ZERO, battlesWon: 1 }, []);
    const firstBlood = progress.find((entry) => entry.def.id === 'first-blood');
    expect(firstBlood?.complete).toBe(true);
    expect(firstBlood?.current).toBe(1);
  });

  it('only reports completed-and-unclaimed achievements as newly completed', () => {
    const metrics = { ...ZERO, battlesWon: 1, bestWinStreak: 5 };
    expect(findNewlyCompleted(metrics, []).map((d) => d.id)).toContain('first-blood');
    expect(findNewlyCompleted(metrics, ['first-blood']).map((d) => d.id)).not.toContain('first-blood');
  });

  it('counts how many rewards are claimable right now', () => {
    expect(countClaimable(ZERO, [])).toBe(0);
    expect(countClaimable({ ...ZERO, battlesWon: 1 }, [])).toBe(1);
  });
});
