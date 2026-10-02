// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { setupGameTestBed } from '../../testing/game-test-bed';
import { base64Encode } from './game-state.helpers';
import { GameStateService } from './game-state.service';

describe('GameStateService flows', () => {
  beforeEach(() => setupGameTestBed());
  afterEach(() => vi.useRealTimers());

  it('evolves a ready creature, unlocks the target and selects it', () => {
    const game = TestBed.inject(GameStateService);
    const candidate = game.readyEvolutionCandidate();
    expect(candidate?.source).toBeTruthy();
    const bioBefore = game.player().bioData;

    game.evolve(candidate!.source!.id, candidate!.target.id);

    expect(game.getMonsterById(candidate!.target.id)?.unlocked).toBe(true);
    expect(game.player().selectedMonsterId).toBe(candidate!.target.id);
    expect(game.player().bioData).toBeGreaterThan(bioBefore);
  });

  it('blocks evolution when requirements are missing', () => {
    const game = TestBed.inject(GameStateService);
    const locked = game.monsters().find((monster) => !monster.unlocked && monster.stage === 'Mega')!;
    const source = game.monsters().find((monster) => monster.evolutionTargets.includes(locked.id))!;
    game.evolve(source.id, locked.id);
    expect(game.getMonsterById(locked.id)?.unlocked).toBe(false);
  });

  it('imports a save code exported by an old version (v5) without failing', () => {
    const game = TestBed.inject(GameStateService);
    const code = base64Encode(
      JSON.stringify({
        saveVersion: 5,
        savedAt: new Date().toISOString(),
        player: { coins: 4321, dnaShards: 77, squadIds: ['M007'], selectedMonsterId: 'M007', inventory: [] },
        monsters: [],
        battleLogs: [],
      }),
    );
    expect(game.importSave(code)).toBe(true);
    expect(game.player().coins).toBe(4321);
    expect(game.player().researchNodes).toEqual([]);
    expect(game.importSave('not a code')).toBe(false);
  });

  it('runs a full auto-mode battle and pays out exactly the revealed reward', async () => {
    vi.useFakeTimers();
    const game = TestBed.inject(GameStateService);
    game.prefs.setBattleControlMode('auto');
    const coinsBefore = game.player().coins;
    const fought = game.player().battlesFought;

    const battle = game.startBattle();
    await vi.advanceTimersByTimeAsync(120_000);
    await battle;

    const reward = game.lastReward();
    expect(reward).not.toBeNull();
    expect(game.player().battlesFought).toBe(fought + 1);
    const paidCoins = game.player().coins - coinsBefore;
    // Daily/boss/medal bonuses can add on top, but never less than the revealed battle reward.
    expect(paidCoins).toBeGreaterThanOrEqual(reward!.coins);
    expect(game.player().recentBattles[0].coins).toBe(reward!.coins);
  });
});
