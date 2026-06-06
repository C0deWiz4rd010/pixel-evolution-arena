import { Directive, ElementRef, HostListener, Input, afterNextRender, inject } from '@angular/core';

/**
 * Roving-tabindex 2D keyboard navigation for a wrapping grid of focusable items.
 * Apply to the grid container; pass a selector for the focusable items.
 * Arrow keys move within/across rows, Home/End jump to the ends. The container
 * becomes a single tab stop (items get tabindex -1 except the active one).
 *
 * Usage: `<div appGridNav=".monster-card">…</div>`
 */
@Directive({
  selector: '[appGridNav]',
  standalone: true,
})
export class GridNavDirective {
  @Input('appGridNav') selector = 'button';

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  constructor() {
    afterNextRender(() => this.syncRoving());
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const keys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (!keys.includes(event.key)) {
      return;
    }
    const items = this.items();
    if (items.length === 0) {
      return;
    }
    const current = this.currentIndex(items);
    const cols = this.columns(items);
    let index = current < 0 ? 0 : current;

    switch (event.key) {
      case 'ArrowRight':
        index = Math.min(items.length - 1, index + 1);
        break;
      case 'ArrowLeft':
        index = Math.max(0, index - 1);
        break;
      case 'ArrowDown':
        index = Math.min(items.length - 1, index + cols);
        break;
      case 'ArrowUp':
        index = Math.max(0, index - cols);
        break;
      case 'Home':
        index = 0;
        break;
      case 'End':
        index = items.length - 1;
        break;
    }

    event.preventDefault();
    this.focusItem(items, index);
  }

  @HostListener('focusin')
  onFocusIn(): void {
    this.syncRoving();
  }

  private items(): HTMLElement[] {
    return Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(this.selector));
  }

  private currentIndex(items: HTMLElement[]): number {
    const active = document.activeElement;
    return items.findIndex((item) => item === active || item.contains(active));
  }

  private columns(items: HTMLElement[]): number {
    const top = items[0].offsetTop;
    let cols = 0;
    for (const item of items) {
      if (item.offsetTop === top) {
        cols += 1;
      } else {
        break;
      }
    }
    return Math.max(1, cols);
  }

  private focusItem(items: HTMLElement[], index: number): void {
    items.forEach((item, i) => (item.tabIndex = i === index ? 0 : -1));
    items[index]?.focus();
  }

  private syncRoving(): void {
    const items = this.items();
    if (items.length === 0) {
      return;
    }
    let activeIndex = this.currentIndex(items);
    if (activeIndex < 0) {
      activeIndex = 0;
    }
    items.forEach((item, i) => (item.tabIndex = i === activeIndex ? 0 : -1));
  }
}
