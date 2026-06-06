import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'info' | 'warn' | 'reward' | 'evolution';

export interface ToastPayload {
  title: string;
  message: string;
  tone?: ToastTone;
  icon?: string;
  durationMs?: number;
}

export interface Toast extends ToastPayload {
  id: number;
  tone: ToastTone;
  enteredAt: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  private seed = 0;
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  push(payload: ToastPayload): number {
    const id = ++this.seed;
    const toast: Toast = {
      id,
      title: payload.title,
      message: payload.message,
      tone: payload.tone ?? 'info',
      icon: payload.icon,
      enteredAt: Date.now(),
      durationMs: payload.durationMs ?? 3600,
    };

    this.toasts.update((current) => [...current.slice(-4), toast]);

    const timer = setTimeout(() => this.dismiss(id), toast.durationMs);
    this.timers.set(id, timer);

    return id;
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toasts.update((current) => current.filter((toast) => toast.id !== id));
  }

  clear(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.toasts.set([]);
  }
}
