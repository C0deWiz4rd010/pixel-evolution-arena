// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { initAngularTestEnvironment } from '../../testing/angular-test-env';
import { GameStore } from './game-store.service';
import { SaveStateService } from './save-state.service';

describe('GameStore', () => {
  beforeEach(() => {
    initAngularTestEnvironment();
    TestBed.resetTestingModule();
  });

  it('coalesces a burst of state changes into a single debounced save', () => {
    vi.useFakeTimers();
    const saveState = vi.fn();
    TestBed.configureTestingModule({ providers: [{ provide: SaveStateService, useValue: { saveState } }] });
    const store = TestBed.inject(GameStore);
    TestBed.tick(); // first effect run only observes the loaded state

    store.prependLog('one', 'info');
    store.prependLog('two', 'info');
    store.player.update((player) => ({ ...player, coins: player.coins + 5 }));
    TestBed.tick();
    expect(saveState).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(saveState).toHaveBeenCalledTimes(1);
    expect(saveState.mock.calls[0][0].battleLogs[0].text).toBe('two');
    vi.useRealTimers();
  });

  it('looks monsters up by id and resolves the squad in slot order', () => {
    TestBed.configureTestingModule({ providers: [{ provide: SaveStateService, useValue: { saveState: vi.fn() } }] });
    const store = TestBed.inject(GameStore);
    const [first, second] = store.monsters();
    store.player.update((player) => ({ ...player, squadIds: [second.id, first.id, 'missing'] }));
    expect(store.getMonsterById(first.id)?.name).toBe(first.name);
    expect(store.squad().map((monster) => monster.id)).toEqual([second.id, first.id]);
  });

  it('caps the battle log and merges settings patches', () => {
    TestBed.configureTestingModule({ providers: [{ provide: SaveStateService, useValue: { saveState: vi.fn() } }] });
    const store = TestBed.inject(GameStore);
    for (let i = 0; i < 50; i++) store.prependLog(`log ${i}`, 'info');
    expect(store.battleLogs()).toHaveLength(36);
    store.updateSettings({ battleSpeed: 4 });
    expect(store.settings().battleSpeed).toBe(4);
    expect(store.settings().motionMode).toBe('system');
  });
});
