/**
 * Status-Effekt-System für die Combat-Engine.
 *
 * Leaf-Modul: importiert nichts aus combat/moves, damit es zyklenfrei bleibt.
 * Die Engine ({@link ./combat.engine}) wendet diese Helfer pro Runde an.
 */

export type StatusId = 'burn' | 'poison' | 'bleed' | 'shock' | 'chill' | 'stun' | 'shield' | 'rally' | 'regen';

export type StatusKind = 'dot' | 'debuff' | 'buff';

export interface StatusDef {
  id: StatusId;
  label: string;
  icon: string;
  kind: StatusKind;
  /** Dauer in Runden. */
  duration: number;
  /**
   * Bedeutung je nach id:
   * - dot (burn/poison): Anteil der max-HP Schaden pro Runde.
   * - debuff (shock/chill): Anteil, um den ausgehender Schaden gesenkt wird.
   * - shield: Anteil, um den eingehender Schaden reduziert wird.
   * - rally: Anteil, um den ausgehender Schaden erhöht wird.
   * - regen: Anteil der max-HP Heilung pro Runde.
   */
  magnitude: number;
  detail: string;
}

export interface ActiveStatus {
  id: StatusId;
  remaining: number;
  magnitude: number;
}

export const STATUS_DEFS: Record<StatusId, StatusDef> = {
  burn: { id: 'burn', label: 'Burn', icon: '🔥', kind: 'dot', duration: 3, magnitude: 0.06, detail: 'Verbrennt — Schaden über Zeit.' },
  poison: { id: 'poison', label: 'Poison', icon: '☣', kind: 'dot', duration: 3, magnitude: 0.05, detail: 'Vergiftet — Schaden über Zeit.' },
  bleed: { id: 'bleed', label: 'Bleed', icon: '🩸', kind: 'dot', duration: 4, magnitude: 0.05, detail: 'Blutet — anhaltender Schaden über Zeit.' },
  shock: { id: 'shock', label: 'Shock', icon: '⚡', kind: 'debuff', duration: 2, magnitude: 0.22, detail: 'Überladen — geringerer Output.' },
  chill: { id: 'chill', label: 'Chill', icon: '❄', kind: 'debuff', duration: 2, magnitude: 0.16, detail: 'Unterkühlt — träger und schwächer.' },
  stun: { id: 'stun', label: 'Stun', icon: '💫', kind: 'debuff', duration: 1, magnitude: 0.4, detail: 'Betäubt — drastisch weniger Output für eine Runde.' },
  shield: { id: 'shield', label: 'Shield', icon: '🛡', kind: 'buff', duration: 2, magnitude: 0.35, detail: 'Abgeschirmt — reduziert Schaden.' },
  rally: { id: 'rally', label: 'Rally', icon: '⥣', kind: 'buff', duration: 2, magnitude: 0.25, detail: 'Angefeuert — mehr Schaden.' },
  regen: { id: 'regen', label: 'Regen', icon: '✚', kind: 'buff', duration: 3, magnitude: 0.08, detail: 'Regeneriert — heilt über Zeit.' },
};

export function getStatusDef(id: StatusId): StatusDef {
  return STATUS_DEFS[id];
}

export function createStatus(id: StatusId): ActiveStatus {
  const def = STATUS_DEFS[id];
  return { id, remaining: def.duration, magnitude: def.magnitude };
}

/**
 * Fügt einen Status hinzu oder frischt einen bestehenden auf (refresh, kein Stapeln),
 * damit Kämpfe nicht in Status-Spiralen entgleisen.
 */
export function applyStatus(statuses: ActiveStatus[], id: StatusId): ActiveStatus[] {
  const def = STATUS_DEFS[id];
  const existing = statuses.find((status) => status.id === id);
  if (existing) {
    return statuses.map((status) => (status.id === id ? { ...status, remaining: def.duration } : status));
  }
  return [...statuses, createStatus(id)];
}

/** Schaden pro Runde aus allen Damage-over-Time-Effekten. */
export function dotDamage(statuses: ActiveStatus[], maxHp: number): number {
  return statuses
    .filter((status) => STATUS_DEFS[status.id].kind === 'dot')
    .reduce((total, status) => total + Math.round(maxHp * status.magnitude), 0);
}

/** Heilung pro Runde aus Regen-Effekten. */
export function regenHeal(statuses: ActiveStatus[], maxHp: number): number {
  return statuses
    .filter((status) => status.id === 'regen')
    .reduce((total, status) => total + Math.round(maxHp * status.magnitude), 0);
}

/** Anteil, um den eingehender Schaden reduziert wird (Shield), gedeckelt bei 60%. */
export function incomingDamageReduction(statuses: ActiveStatus[]): number {
  const shield = statuses.filter((status) => status.id === 'shield').reduce((total, status) => total + status.magnitude, 0);
  return Math.min(0.6, shield);
}

/**
 * Multiplikator für ausgehenden Schaden:
 * rally erhöht, shock/chill senken. Geklemmt auf einen sinnvollen Bereich.
 */
export function outgoingDamageMultiplier(statuses: ActiveStatus[]): number {
  let multiplier = 1;
  for (const status of statuses) {
    if (status.id === 'rally') {
      multiplier += status.magnitude;
    } else if (status.id === 'shock' || status.id === 'chill' || status.id === 'stun') {
      multiplier -= status.magnitude;
    }
  }
  return Math.max(0.35, Math.min(1.6, multiplier));
}

/** Reduziert die Restdauer aller Status um eins und entfernt abgelaufene. */
export function tickStatuses(statuses: ActiveStatus[]): ActiveStatus[] {
  return statuses
    .map((status) => ({ ...status, remaining: status.remaining - 1 }))
    .filter((status) => status.remaining > 0);
}

export function hasStatus(statuses: ActiveStatus[], id: StatusId): boolean {
  return statuses.some((status) => status.id === id);
}
