import '@angular/compiler';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

/** Initialise Angular's TestBed once per worker so store specs can use real DI and effects. */
export function initAngularTestEnvironment(): void {
  const testBed = getTestBed();
  if (!testBed.platform) {
    testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  }
}
