import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));

// Register the offline-first service worker (production builds only).
if ('serviceWorker' in navigator && location.hostname !== 'localhost' && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // Best-effort: the app works fine without offline support.
    });
  });
}
