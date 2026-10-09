import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { BattleLog, BattleReward } from '../models/battle.model';
import { Monster } from '../models/monster.model';
import { PlayerSettings, PlayerState } from '../models/player-state.model';
import { serializeMonsterProgress } from '../models/save-state.model';
import { ArenaThreatProfile } from '../rules/battle.rules';
import { createStarterBattleLogs, createStarterMonsters, createStarterPlayerState } from './game-state.helpers';
import { SaveStateService } from './save-state.service';

/** Coalesces bursts of state updates (one action often touches several signals) into one write. */
const SAVE_DEBOUNCE_MS = 250;
const MAX_BATTLE_LOGS = 36;

/**
 * Root game state shared by every domain store: the persisted signals, the roster lookup,
 * the battle log and the single debounced persistence path. Domain logic lives in the
 * feature stores (gear, research, settings, ...) and in GameStateService.
 */
@Injectable({ providedIn: 'root' })
export class GameStore {
  private readonly saveState = inject(SaveStateService);

  readonly monsters = signal<Monster[]>(createStarterMonsters());
  readonly player = signal<PlayerState>(createStarterPlayerState());
  readonly battleLogs = signal<BattleLog[]>(createStarterBattleLogs());
  readonly lastReward = signal<BattleReward | null>(null);
  readonly lastBattleThreat = signal<ArenaThreatProfile | null>(null);

  /** O(1) id lookup; rebuilt only when the roster signal changes. */
  private readonly monsterIndex = computed(() => new Map(this.monsters().map((monster) => [monster.id, monster])));

  readonly settings = computed(() => this.player().settings);
  /** OS-level reduced motion, kept live so switching the system setting applies immediately. */
  private readonly systemReducedMotion = signal(
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  /** True when either the in-app setting or the OS asks for reduced motion. */
  readonly motionReduced = computed(() => this.settings().motionMode === 'reduced' || this.systemReducedMotion());
  readonly unlockedCount = computed(() => this.monsters().filter((monster) => monster.unlocked).length);
  readonly squad = computed(() =>
    this.player()
      .squadIds.map((id) => this.monsterIndex().get(id))
      .filter((monster): monster is Monster => Boolean(monster)),
  );

  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private autosaveArmed = false;

  constructor() {
    // Single persistence path: any change to saved state schedules one debounced write.
    // The first run only observes the freshly loaded state, so loading never rewrites it.
    effect(() => {
      this.player();
      this.monsters();
      this.battleLogs();
      this.lastReward();
      this.lastBattleThreat();
      if (!this.autosaveArmed) {
        this.autosaveArmed = true;
        return;
      }
      this.scheduleSave();
    });
    this.watchPageLifecycle();
    if (typeof matchMedia === 'function') {
      matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (event) => this.systemReducedMotion.set(event.matches));
    }
  }

  getMonsterById(id: string): Monster | undefined {
    return this.monsterIndex().get(id);
  }

  prependLog(text: string, type: BattleLog['type']): void {
    this.battleLogs.update((logs) => [{ text, type }, ...logs].slice(0, MAX_BATTLE_LOGS));
  }

  updateSettings(patch: Partial<PlayerSettings>): void {
    this.player.update((player) => ({ ...player, settings: { ...player.settings, ...patch } }));
  }

  /** Write any pending autosave immediately (manual "Save now" and page hide). */
  flushSave(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    // Signal values are immutable snapshots, so they can be serialized without cloning.
    this.saveState.saveState({
      player: this.player(),
      monsters: this.monsters().map((monster) => serializeMonsterProgress(monster)),
      battleLogs: this.battleLogs(),
      lastReward: this.lastReward(),
      lastBattleThreat: this.lastBattleThreat(),
    });
  }

  private scheduleSave(): void {
    if (this.saveTimer !== null) return;
    this.saveTimer = setTimeout(() => this.flushSave(), SAVE_DEBOUNCE_MS);
  }

  /** Flush the debounced save when the page is hidden or closed so no progress is lost. */
  private watchPageLifecycle(): void {
    if (typeof window === 'undefined') return;
    const flushIfPending = () => {
      if (this.saveTimer !== null) this.flushSave();
    };
    window.addEventListener('pagehide', flushIfPending);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushIfPending();
    });
  }
}
