import { describe, expect, it } from 'vitest';
import { CAMPAIGN_CHAPTERS } from '../data/campaign.data';
import { CampaignMetrics, evaluateCampaign, findClaimableChapter } from './campaign.rules';

function metrics(overrides: Partial<CampaignMetrics> = {}): CampaignMetrics {
  return {
    battlesWon: 0,
    unlockedCount: 0,
    bestWinStreak: 0,
    flawlessWins: 0,
    defeatedBosses: 0,
    stageMilestones: 0,
    gauntletBestWave: 0,
    ...overrides,
  };
}

describe('campaign.rules', () => {
  it('marks the first chapter active and later chapters locked at zero progress', () => {
    const progress = evaluateCampaign(metrics(), []);
    expect(progress[0].status).toBe('active');
    expect(progress[1].status).toBe('locked');
  });

  it('marks a met objective as ready when the previous chapter is cleared', () => {
    const first = CAMPAIGN_CHAPTERS[0];
    const progress = evaluateCampaign(metrics({ battlesWon: first.objective.goal }), []);
    expect(progress[0].status).toBe('ready');
  });

  it('treats claimed chapters as claimed and unlocks the next', () => {
    const [first, second] = CAMPAIGN_CHAPTERS;
    const progress = evaluateCampaign(metrics({ battlesWon: first.objective.goal }), [first.id]);
    expect(progress[0].status).toBe('claimed');
    expect(progress[1].status).not.toBe('locked');
  });

  it('computes a clamped percent', () => {
    const first = CAMPAIGN_CHAPTERS[0];
    const progress = evaluateCampaign(metrics({ battlesWon: first.objective.goal * 5 }), []);
    expect(progress[0].percent).toBe(100);
  });

  it('finds the claimable chapter', () => {
    const first = CAMPAIGN_CHAPTERS[0];
    const claimable = findClaimableChapter(metrics({ battlesWon: first.objective.goal }), []);
    expect(claimable?.id).toBe(first.id);
    expect(findClaimableChapter(metrics(), [])).toBeNull();
  });
});
