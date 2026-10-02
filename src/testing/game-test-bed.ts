import { TestBed } from '@angular/core/testing';
import { AudioService } from '../app/services/audio.service';
import { initAngularTestEnvironment } from './angular-test-env';

/** Silent AudioService stand-in: every method is a no-op so specs never touch Web Audio. */
const silentAudio = new Proxy(
  {},
  { get: (_target, prop) => (prop === 'enabled' || prop === 'musicEnabled' ? () => false : () => false) },
);

/** Fresh TestBed with an empty localStorage, ready to inject any game store. */
export function setupGameTestBed(): void {
  initAngularTestEnvironment();
  TestBed.resetTestingModule();
  localStorage.clear();
  TestBed.configureTestingModule({ providers: [{ provide: AudioService, useValue: silentAudio }] });
}
