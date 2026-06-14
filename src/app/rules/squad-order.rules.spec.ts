import { describe, expect, it } from 'vitest';
import { buildSquadOrders, SquadOrderSnapshot } from './squad-order.rules';

const baseSnapshot: SquadOrderSnapshot = {
  squadSize: 3,
  teamPower: 920,
  enemyPower: 850,
  winChancePercent: 72,
  candidateName: 'Cinderpaw',
  weakestName: 'Aquabun',
  powerGain: 0,
  trainingLabel: 'Squad Calibration',
  trainingXp: 18,
  trainingCost: 90,
  canTrain: true,
  gearReady: false,
  gearPowerGain: 0,
  readyEvolutionName: null,
  typePressureLabel: 'Type edge stable',
  synergyCount: 1,
};

describe('squad order rules', () => {
  it('routes an empty squad to auto squad', () => {
    const orders = buildSquadOrders({ ...baseSnapshot, squadSize: 0 });

    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ id: 'load-squad', actionId: 'auto-squad', tone: 'warning' });
  });

  it('prioritizes filling open slots', () => {
    const orders = buildSquadOrders({ ...baseSnapshot, squadSize: 1 });

    expect(orders[0]).toMatchObject({ id: 'fill-slots', actionId: 'auto-squad' });
  });

  it('prioritizes reserve swaps when they add power', () => {
    const orders = buildSquadOrders({ ...baseSnapshot, powerGain: 95 });

    expect(orders[0]).toMatchObject({ id: 'swap-reserve', actionId: 'swap-reserve', metric: '+95 PW' });
  });

  it('surfaces gear sync when the loadout can improve', () => {
    const orders = buildSquadOrders({ ...baseSnapshot, gearReady: true, gearPowerGain: 42 });

    expect(orders.some((order) => order.id === 'gear-sync')).toBe(true);
  });

  it('keeps shaky teams focused on training', () => {
    const orders = buildSquadOrders({ ...baseSnapshot, winChancePercent: 44, powerGain: 0 });

    expect(orders.some((order) => order.id === 'squad-training')).toBe(true);
    expect(orders.findIndex((order) => order.id === 'squad-training')).toBeLessThan(
      orders.findIndex((order) => order.id === 'battle-ready'),
    );
  });
});
