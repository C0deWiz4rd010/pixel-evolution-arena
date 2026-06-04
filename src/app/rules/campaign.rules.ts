/** Pure campaign progress evaluation. */
import { CAMPAIGN_CHAPTERS, CampaignChapter, CampaignMetric } from '../data/campaign.data';

export type CampaignMetrics = Record<CampaignMetric, number>;

export type ChapterStatus = 'locked' | 'active' | 'ready' | 'claimed';

export interface ChapterProgress {
  chapter: CampaignChapter;
  status: ChapterStatus;
  current: number;
  goal: number;
  percent: number;
}

export function evaluateCampaign(metrics: CampaignMetrics, claimedChapters: string[]): ChapterProgress[] {
  const claimed = new Set(claimedChapters);
  const chapters = [...CAMPAIGN_CHAPTERS].sort((a, b) => a.index - b.index);

  return chapters.map((chapter, position) => {
    const current = metrics[chapter.objective.metric] ?? 0;
    const goal = chapter.objective.goal;
    const percent = Math.max(0, Math.min(100, Math.round((current / goal) * 100)));
    const isClaimed = claimed.has(chapter.id);
    const previousClaimed = position === 0 || claimed.has(chapters[position - 1].id);

    let status: ChapterStatus;
    if (isClaimed) {
      status = 'claimed';
    } else if (!previousClaimed) {
      status = 'locked';
    } else if (current >= goal) {
      status = 'ready';
    } else {
      status = 'active';
    }

    return { chapter, status, current, goal, percent };
  });
}

/** The chapter the player can claim right now, if any. */
export function findClaimableChapter(metrics: CampaignMetrics, claimedChapters: string[]): CampaignChapter | null {
  return evaluateCampaign(metrics, claimedChapters).find((entry) => entry.status === 'ready')?.chapter ?? null;
}

export function campaignSummary(metrics: CampaignMetrics, claimedChapters: string[]): { claimed: number; total: number; active: ChapterProgress | null } {
  const progress = evaluateCampaign(metrics, claimedChapters);
  const claimed = progress.filter((entry) => entry.status === 'claimed').length;
  const active = progress.find((entry) => entry.status === 'ready' || entry.status === 'active') ?? null;
  return { claimed, total: progress.length, active };
}
