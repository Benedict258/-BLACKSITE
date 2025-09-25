/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

// eslint-disable-next-line no-restricted-globals
declare let self: ServiceWorkerGlobalScope;

clientsClaim();
cleanupOutdatedCaches();

// The self.__WB_MANIFEST is injected at build time
precacheAndRoute(self.__WB_MANIFEST || []);

// Cache same-origin navigation requests (SPA shell)
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new StaleWhileRevalidate()
);

// Cache static assets (images/fonts)
registerRoute(
  ({ request }) => ['image', 'font'].includes(request.destination),
  new StaleWhileRevalidate({ cacheName: 'assets-cache' })
);
