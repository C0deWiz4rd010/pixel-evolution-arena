import { computed, inject, Injectable } from '@angular/core';
import { RESEARCH_NODES, getResearchNode } from '../data/research.data';
import { buildResearchTree, canUnlockNode, cheapestAvailableNode, deriveResearchModifiers, ResearchModifiers, ResearchNodeView } from '../rules/research.rules';
import { GameStore } from './game-store.service';
import { AudioService } from './audio.service';
import { ToastService } from './toast.service';

/** Bio-Data economy, creature scan registry and the permanent Research Lab upgrades. */
@Injectable({ providedIn: 'root' })
export class ResearchStore {
  private readonly store = inject(GameStore);
  private readonly audio = inject(AudioService);
  private readonly toast = inject(ToastService);

  readonly bioData = computed(() => this.store.player().bioData);

  readonly totalBioData = computed(() => this.store.player().totalBioData);

  readonly researchModifiers = computed<ResearchModifiers>(() => deriveResearchModifiers(this.store.player().researchNodes));

  readonly researchTree = computed<ResearchNodeView[]>(() =>
    buildResearchTree(this.store.player().researchNodes, this.store.player().bioData),
  );

  readonly researchUnlockedCount = computed(() => this.store.player().researchNodes.length);

  readonly researchTotalCount = RESEARCH_NODES.length;

  /** Owned creatures with their scan completion, richest data first. */
  readonly scanRegistry = computed(() => {
    const progress = this.store.player().scanProgress;
    return this.store.monsters()
      .filter((monster) => monster.unlocked)
      .map((monster) => ({ monster, scan: Math.round(progress[monster.id] ?? 0) }))
      .sort((a, b) => b.scan - a.scan);
  });

  /** Fully-scanned creature count out of unlocked creatures. */
  readonly fullyScannedCount = computed(() => this.scanRegistry().filter((entry) => entry.scan >= 100).length);

  readonly scanCompletionPercent = computed(() => {
    const registry = this.scanRegistry();
    if (registry.length === 0) return 0;
    const total = registry.reduce((sum, entry) => sum + entry.scan, 0);
    return Math.round(total / registry.length);
  });

  /** True once research reveals exact locked evolution intel everywhere. */
  readonly revealLocked = computed(() => this.researchModifiers().revealLocked);

  /** The cheapest research node the player can unlock right now, if any. */
  readonly recommendedResearch = computed<ResearchNodeView | null>(
    () => cheapestAvailableNode(this.researchTree()),
  );

  /** Spend Bio-Data to permanently unlock a research node. */
  unlockResearch(nodeId: string): boolean {
    const node = getResearchNode(nodeId);
    if (!node) {
      return false;
    }
    const player = this.store.player();
    const unlocked = new Set(player.researchNodes);
    if (!canUnlockNode(node, unlocked, player.bioData)) {
      if (unlocked.has(nodeId)) {
        this.store.prependLog(`${node.name} is already online.`, 'system');
      } else if (!node.requires.every((req) => unlocked.has(req))) {
        this.store.prependLog(`${node.name} needs an earlier research first.`, 'system');
      } else {
        this.store.prependLog(`Not enough Bio-Data for ${node.name} (need ${node.cost}).`, 'system');
      }
      return false;
    }

    this.store.player.update((current) => ({
      ...current,
      bioData: current.bioData - node.cost,
      researchNodes: [...current.researchNodes, node.id],
    }));
    this.store.prependLog(`Research online: ${node.name}. ${node.detail}`, 'reward');
    this.audio.play('item');
    this.toast.push({
      title: 'Research Complete',
      message: `${node.name} — ${node.detail}`,
      tone: 'reward',
      icon: node.icon,
      durationMs: 4200,
    });
    return true;
  }
}
