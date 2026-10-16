import { Directive, ElementRef, Input, OnDestroy, OnInit, inject } from '@angular/core';

/**
 * Tweens an element's text content toward a numeric target for a bit of juice.
 * Honors prefers-reduced-motion by snapping instantly.
 */
@Directive({
  selector: '[appCountUp]',
  standalone: true,
})
export class CountUpDirective implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);

  private current = 0;
  private target = 0;
  private startValue = 0;
  private startTime = 0;
  private readonly durationMs = 520;
  private frame = 0;
  private initialized = false;

  /** When set, the first render counts up from this value (e.g. 0 for a reward reveal). */
  @Input() countFrom: number | null = null;

  @Input({ required: true, alias: 'appCountUp' })
  set value(next: number) {
    const numeric = Number.isFinite(next) ? next : 0;
    if (!this.initialized) {
      this.initialized = true;
      this.current = numeric;
      this.target = numeric;
      this.render(numeric);
      return;
    }
    if (numeric === this.target) {
      return;
    }
    this.target = numeric;
    if (this.prefersReducedMotion()) {
      this.current = numeric;
      this.render(numeric);
      return;
    }
    this.startValue = this.current;
    this.startTime = performance.now();
    this.startLoop();
  }

  ngOnInit(): void {
    if (this.countFrom === null || this.prefersReducedMotion() || this.countFrom === this.target) {
      return;
    }
    this.startValue = this.countFrom;
    this.current = this.countFrom;
    this.startTime = performance.now();
    this.render(this.countFrom);
    this.startLoop();
  }

  ngOnDestroy(): void {
    this.cancel();
  }

  private startLoop(): void {
    if (this.frame !== 0) {
      return;
    }
    this.frame = requestAnimationFrame(this.step);
  }

  private readonly step = (now: number): void => {
    this.frame = 0;
    const progress = Math.min(1, (now - this.startTime) / this.durationMs);
    const eased = 1 - Math.pow(1 - progress, 3);
    this.current = this.startValue + (this.target - this.startValue) * eased;
    this.render(progress >= 1 ? this.target : this.current);
    if (progress < 1) {
      this.frame = requestAnimationFrame(this.step);
    } else {
      this.current = this.target;
    }
  };

  private render(value: number): void {
    this.el.nativeElement.textContent = `${Math.round(value)}`;
  }

  private cancel(): void {
    if (this.frame !== 0) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }
}
