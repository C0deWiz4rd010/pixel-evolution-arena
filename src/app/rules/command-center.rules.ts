export type CommandCenterTone = 'ready' | 'warning' | 'meta' | 'system';
export type MetaActionId =
  | 'auto-squad'
  | 'evolve-ready'
  | 'run-battle'
  | 'claim-chapter'
  | 'forge-quick'
  | 'expedition'
  | 'save-now';

export interface CommandCenterCard {
  id: string;
  label: string;
  title: string;
  detail: string;
  metric: string;
  progressPercent: number;
  tone: CommandCenterTone;
  actionId: MetaActionId;
  actionLabel: string;
}

export interface CommandCenterSnapshot {
  squadSize: number;
  dailyLabel: string;
  dailyDetail: string;
  dailyProgress: number;
  dailyGoal: number;
  dailyComplete: boolean;
  readyEvolutionName: string | null;
  nextEvolutionName: string | null;
  nextEvolutionPercent: number;
  claimableChapterTitle: string | null;
  nextChapterTitle: string | null;
  nextChapterProgress: number;
  nextChapterGoal: number;
  nextChapterPercent: number;
  expeditionStatus: 'idle' | 'active' | 'reward';
  expeditionDepth: number;
  expeditionMaxDepth: number;
  expeditionHp: number;
  expeditionMaxHp: number;
  expeditionCores: number;
  forgeTitle: string;
  forgeDetail: string;
  forgeMetric: string;
  forgeReady: boolean;
}

export interface MedalFocusSnapshot {
  dailyLabel: string;
  dailyProgress: number;
  dailyGoal: number;
  dailyComplete: boolean;
  bestStreak: number;
  nextStreakMilestone: number | null;
  bossesDefeated: number;
  totalBosses: number;
  unlockedMonsters: number;
  totalMonsters: number;
}

export interface BossPrepSnapshot {
  bossName: string | null;
  bossTelegraph: string | null;
  bossCounter: string | null;
  bossRewardCoins: number;
  bossRewardDna: number;
  teamPower: number;
  enemyPower: number;
  battleTrend: 'empty' | 'hot' | 'steady' | 'cold';
  overdriveReady: boolean;
}

export interface SystemCheckSnapshot {
  saveStatus: 'SYNCED' | 'VOLATILE' | 'ERROR';
  lastSavedLabel: string;
  exportReady: boolean;
  colorblindMode: boolean;
  combatBeats: boolean;
  effectIntensity: number;
  audioEnabled: boolean;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildCommandCenterCards(snapshot: CommandCenterSnapshot): CommandCenterCard[] {
  const dailyPercent = snapshot.dailyGoal > 0 ? (snapshot.dailyProgress / snapshot.dailyGoal) * 100 : 0;
  const expeditionPercent =
    snapshot.expeditionStatus === 'active' && snapshot.expeditionMaxDepth > 0
      ? (snapshot.expeditionDepth / snapshot.expeditionMaxDepth) * 100
      : snapshot.expeditionStatus === 'reward'
        ? 100
        : snapshot.squadSize === 0
          ? 0
          : 100;

  return [
    {
      id: 'daily-relay',
      label: 'Daily Relay',
      title: snapshot.dailyComplete ? 'Directive payout secured' : snapshot.dailyLabel,
      detail: snapshot.dailyComplete
        ? 'The current directive is already complete. Keep battling to compound medals and chapter pressure.'
        : snapshot.dailyDetail,
      metric: `${snapshot.dailyProgress}/${snapshot.dailyGoal}`,
      progressPercent: clampPercent(dailyPercent),
      tone: snapshot.dailyComplete ? 'ready' : 'meta',
      actionId: 'run-battle',
      actionLabel: 'Run Battle',
    },
    {
      id: 'evolution-lane',
      label: 'Evolution Lane',
      title: snapshot.readyEvolutionName
        ? `${snapshot.readyEvolutionName} can go online`
        : snapshot.nextEvolutionName
          ? `${snapshot.nextEvolutionName} is the next route`
          : 'Roster routes are stable',
      detail: snapshot.readyEvolutionName
        ? 'A funded evolution is waiting. Convert the route now for an immediate power spike.'
        : snapshot.nextEvolutionName
          ? 'Keep feeding XP and resources into the current chase until the route clears.'
          : 'No immediate route pressure remains. Push chapters, bosses, or codex cleanup.',
      metric: snapshot.readyEvolutionName
        ? 'READY'
        : snapshot.nextEvolutionName
          ? `${clampPercent(snapshot.nextEvolutionPercent)}% sync`
          : 'CLEAR',
      progressPercent: snapshot.readyEvolutionName ? 100 : clampPercent(snapshot.nextEvolutionPercent),
      tone: snapshot.readyEvolutionName ? 'ready' : snapshot.nextEvolutionName ? 'meta' : 'system',
      actionId: snapshot.readyEvolutionName ? 'evolve-ready' : snapshot.squadSize === 0 ? 'auto-squad' : 'run-battle',
      actionLabel: snapshot.readyEvolutionName ? 'Evolve Now' : snapshot.squadSize === 0 ? 'Auto Squad' : 'Farm Route',
    },
    {
      id: 'campaign-lane',
      label: 'Campaign Lane',
      title: snapshot.claimableChapterTitle
        ? `${snapshot.claimableChapterTitle} ready to claim`
        : snapshot.nextChapterTitle ?? 'Campaign synced',
      detail: snapshot.claimableChapterTitle
        ? 'A one-time chapter reward is live. Claim it now before drifting back into arena farming.'
        : snapshot.nextChapterTitle
          ? 'Current chapter pressure is active. Use battles, unlocks, or boss clears to move the track.'
          : 'Every visible chapter reward has already been secured.',
      metric: snapshot.claimableChapterTitle
        ? 'CLAIM'
        : snapshot.nextChapterTitle
          ? `${snapshot.nextChapterProgress}/${snapshot.nextChapterGoal}`
          : 'DONE',
      progressPercent: snapshot.claimableChapterTitle ? 100 : clampPercent(snapshot.nextChapterPercent),
      tone: snapshot.claimableChapterTitle ? 'ready' : snapshot.nextChapterTitle ? 'meta' : 'system',
      actionId: snapshot.claimableChapterTitle ? 'claim-chapter' : 'run-battle',
      actionLabel: snapshot.claimableChapterTitle ? 'Claim Chapter' : 'Build Progress',
    },
    {
      id: 'relay-lane',
      label: 'Support Relay',
      title:
        snapshot.expeditionStatus === 'active'
          ? `Expedition depth ${snapshot.expeditionDepth}/${snapshot.expeditionMaxDepth}`
          : snapshot.expeditionStatus === 'reward'
            ? 'Expedition payout ready'
            : snapshot.forgeTitle,
      detail:
        snapshot.expeditionStatus === 'active'
          ? 'A live deep-grid run is open. Resume it before going back to routine arena loops.'
          : snapshot.expeditionStatus === 'reward'
            ? 'The run is finished. Bank the core haul before launching another side loop.'
            : snapshot.forgeDetail,
      metric:
        snapshot.expeditionStatus === 'active'
          ? `HP ${snapshot.expeditionHp}/${snapshot.expeditionMaxHp}`
          : snapshot.expeditionStatus === 'reward'
            ? `${snapshot.expeditionCores} cores`
            : snapshot.forgeMetric,
      progressPercent: clampPercent(expeditionPercent),
      tone:
        snapshot.expeditionStatus === 'reward'
          ? 'ready'
          : snapshot.expeditionStatus === 'active'
            ? 'meta'
            : snapshot.forgeReady
              ? 'ready'
              : 'warning',
      actionId: snapshot.expeditionStatus === 'idle' ? 'forge-quick' : 'expedition',
      actionLabel:
        snapshot.expeditionStatus === 'active'
          ? 'Resume Run'
          : snapshot.expeditionStatus === 'reward'
            ? 'Bank Cores'
            : snapshot.forgeReady
              ? 'Run Forge'
              : 'Stabilize Gear',
    },
  ];
}

export function buildMedalFocusCards(snapshot: MedalFocusSnapshot): CommandCenterCard[] {
  const streakGoal = snapshot.nextStreakMilestone ?? Math.max(3, snapshot.bestStreak + 1);
  const streakProgress = streakGoal > 0 ? (snapshot.bestStreak / streakGoal) * 100 : 0;

  return [
    {
      id: 'medal-daily',
      label: 'Directive',
      title: snapshot.dailyComplete ? 'Daily reward already secured' : snapshot.dailyLabel,
      detail: snapshot.dailyComplete
        ? 'Use extra battles to push chapters, boss codex, and deeper achievement thresholds.'
        : 'The daily line is the fastest repeatable medal pressure in the current loop.',
      metric: `${snapshot.dailyProgress}/${snapshot.dailyGoal}`,
      progressPercent: snapshot.dailyGoal > 0 ? clampPercent((snapshot.dailyProgress / snapshot.dailyGoal) * 100) : 0,
      tone: snapshot.dailyComplete ? 'ready' : 'meta',
      actionId: 'run-battle',
      actionLabel: 'Push Directive',
    },
    {
      id: 'medal-streak',
      label: 'Streak Ladder',
      title: snapshot.nextStreakMilestone ? `Next streak medal at x${snapshot.nextStreakMilestone}` : 'Streak ladder topped',
      detail: 'Longer clean chains stack milestone value, chapter momentum, and stronger reward confidence.',
      metric: `Best x${snapshot.bestStreak}`,
      progressPercent: clampPercent(streakProgress),
      tone: snapshot.bestStreak >= streakGoal ? 'ready' : 'warning',
      actionId: 'run-battle',
      actionLabel: 'Chase Streak',
    },
    {
      id: 'medal-boss',
      label: 'Boss Ledger',
      title: `${snapshot.bossesDefeated}/${snapshot.totalBosses} bosses in codex`,
      detail: 'Boss clears unlock codex intel and contribute to the rarest achievement bands.',
      metric: snapshot.bossesDefeated === snapshot.totalBosses ? 'COMPLETE' : 'SURGE LOOP',
      progressPercent: snapshot.totalBosses > 0 ? clampPercent((snapshot.bossesDefeated / snapshot.totalBosses) * 100) : 0,
      tone: snapshot.bossesDefeated === snapshot.totalBosses ? 'ready' : 'meta',
      actionId: 'run-battle',
      actionLabel: 'Find Boss',
    },
    {
      id: 'medal-roster',
      label: 'Roster Codex',
      title: `${snapshot.unlockedMonsters}/${snapshot.totalMonsters} signals online`,
      detail: 'A broader roster supports stage milestones, chase goals, and more achievement unlock paths.',
      metric: `${snapshot.totalMonsters - snapshot.unlockedMonsters} locked`,
      progressPercent: snapshot.totalMonsters > 0 ? clampPercent((snapshot.unlockedMonsters / snapshot.totalMonsters) * 100) : 0,
      tone: snapshot.unlockedMonsters === snapshot.totalMonsters ? 'ready' : 'meta',
      actionId: 'evolve-ready',
      actionLabel: 'Unlock Next',
    },
  ];
}

export function buildBossPrepCards(snapshot: BossPrepSnapshot): CommandCenterCard[] {
  if (!snapshot.bossName) {
    return [
      {
        id: 'boss-window',
        label: 'Surge Window',
        title: 'No named boss on the next run',
        detail: 'Every fifth arena surge rotates a boss into the grid. Build power and clean resources until then.',
        metric: snapshot.battleTrend === 'empty' ? 'NO INTEL' : snapshot.battleTrend.toUpperCase(),
        progressPercent: 0,
        tone: 'system',
        actionId: 'run-battle',
        actionLabel: 'Seed Runs',
      },
    ];
  }

  const pressurePercent =
    snapshot.enemyPower > 0 ? clampPercent((snapshot.teamPower / snapshot.enemyPower) * 100) : 0;

  return [
    {
      id: 'boss-window',
      label: 'Surge Window',
      title: snapshot.bossName,
      detail: snapshot.bossTelegraph ?? 'Boss surge detected.',
      metric: `${snapshot.teamPower} vs ${snapshot.enemyPower}`,
      progressPercent: pressurePercent,
      tone: snapshot.teamPower >= snapshot.enemyPower ? 'ready' : 'warning',
      actionId: 'run-battle',
      actionLabel: 'Open Arena',
    },
    {
      id: 'boss-counter',
      label: 'Counterplay',
      title: snapshot.bossCounter ?? 'No counterplay note',
      detail: snapshot.overdriveReady
        ? 'Overdrive is online. Combine it with the counter line for the cleanest boss clear.'
        : 'If the core is not ready yet, use routine runs to charge it before forcing the surge.',
      metric: snapshot.overdriveReady ? 'OVERDRIVE READY' : 'CORE CHARGING',
      progressPercent: snapshot.overdriveReady ? 100 : 45,
      tone: snapshot.overdriveReady ? 'ready' : 'meta',
      actionId: 'run-battle',
      actionLabel: snapshot.overdriveReady ? 'Spend Core' : 'Charge Core',
    },
    {
      id: 'boss-payout',
      label: 'Reward Spike',
      title: `+${snapshot.bossRewardCoins} CR / +${snapshot.bossRewardDna} DNA`,
      detail: 'Boss clears are the fattest single-run burst in the current loop, especially if the kill is clean.',
      metric: snapshot.battleTrend === 'hot' ? 'HOT WINDOW' : snapshot.battleTrend.toUpperCase(),
      progressPercent: snapshot.battleTrend === 'hot' ? 100 : snapshot.battleTrend === 'steady' ? 66 : 40,
      tone: snapshot.battleTrend === 'cold' ? 'warning' : 'meta',
      actionId: 'run-battle',
      actionLabel: 'Take Surge',
    },
  ];
}

export function buildSystemCheckCards(snapshot: SystemCheckSnapshot): CommandCenterCard[] {
  return [
    {
      id: 'save-core',
      label: 'Save Core',
      title: snapshot.saveStatus,
      detail: `Latest local archive status: ${snapshot.lastSavedLabel}.`,
      metric: snapshot.exportReady ? 'EXPORT READY' : 'LIVE ONLY',
      progressPercent: snapshot.saveStatus === 'SYNCED' ? 100 : snapshot.saveStatus === 'VOLATILE' ? 55 : 20,
      tone: snapshot.saveStatus === 'ERROR' ? 'warning' : snapshot.saveStatus === 'SYNCED' ? 'ready' : 'meta',
      actionId: 'save-now',
      actionLabel: 'Sync Save',
    },
    {
      id: 'access-rig',
      label: 'Access Rig',
      title: snapshot.colorblindMode ? 'Glyph assist online' : 'Default visual grid',
      detail: snapshot.colorblindMode
        ? 'Type glyph support is active for easier readback across neon panels.'
        : 'Enable glyph assistance if type colors or glows start blending together.',
      metric: `${Math.round(snapshot.effectIntensity * 100)}% FX`,
      progressPercent: clampPercent(snapshot.effectIntensity * 100),
      tone: snapshot.effectIntensity <= 0.4 ? 'ready' : 'meta',
      actionId: 'save-now',
      actionLabel: 'Store Settings',
    },
    {
      id: 'combat-rig',
      label: 'Combat Rig',
      title: snapshot.combatBeats ? 'Beat prompt armed' : 'Combat beat prompt offline',
      detail: snapshot.combatBeats
        ? 'Timing prompts can add a capped bonus during live battles.'
        : 'Enable the optional beat prompt if you want more active arena input.',
      metric: snapshot.audioEnabled ? 'AUDIO ON' : 'AUDIO OFF',
      progressPercent: snapshot.combatBeats ? 100 : 40,
      tone: snapshot.combatBeats ? 'ready' : 'system',
      actionId: 'save-now',
      actionLabel: 'Keep Profile',
    },
  ];
}
