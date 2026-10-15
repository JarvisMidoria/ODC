import { normalizeSanityCallback } from '../cms/auth-callback.js';

const normalized = normalizeSanityCallback(window.location.href);
if (normalized) window.history.replaceState(null, '', normalized);
// Auth callback normalization must run before Sanity's modules are evaluated.
await import('./sanity-app.js');
