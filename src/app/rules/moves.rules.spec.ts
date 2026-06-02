import { describe, expect, it } from 'vitest';
import { getMonsterMoves, getOverdriveMove } from './moves.rules';

describe('moves rules', () => {
  it('gives early-stage monsters a simpler two-move set', () => {
    const moves = getMonsterMoves({ type: 'Fire', stage: 'Baby' });
    expect(moves).toHaveLength(2);
    expect(moves[0].kind).toBe('strike');
  });

  it('gives Rookie and later the full three-move kit', () => {
    const moves = getMonsterMoves({ type: 'Water', stage: 'Champion' });
    expect(moves).toHaveLength(3);
    expect(moves.map((move) => move.kind)).toEqual(['strike', 'status', 'heavy']);
  });

  it('maps each type to a thematic status move', () => {
    expect(getMonsterMoves({ type: 'Fire', stage: 'Rookie' })[1].status).toBe('burn');
    expect(getMonsterMoves({ type: 'Water', stage: 'Rookie' })[1].status).toBe('chill');
    expect(getMonsterMoves({ type: 'Nature', stage: 'Rookie' })[1].status).toBe('poison');
  });

  it('exposes a high-power overdrive move per type', () => {
    const overdrive = getOverdriveMove('Dark');
    expect(overdrive.kind).toBe('overdrive');
    expect(overdrive.power).toBeGreaterThan(1.3);
  });
});
