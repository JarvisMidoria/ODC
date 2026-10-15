// Vercel Marketplace still returns the legacy ?url=auth/fetch callback.
// Studio 6 consumes #sid instead. Keep the exchange entirely in Sanity's SDK.
export function normalizeSanityCallback(href) {
  const current = new URL(href);
  const raw = current.searchParams.get('url');
  if (!raw) return null;
  let callback;
  try { callback = new URL(raw); } catch { return null; }
  const sid = callback.searchParams.get('sid');
  if (callback.origin !== 'https://api.sanity.io' || callback.pathname !== '/v1/auth/fetch' || !/^[a-zA-Z0-9_-]{20,512}$/.test(sid || '')) return null;
  current.searchParams.delete('url');
  current.hash = `sid=${encodeURIComponent(sid)}`;
  return current.href;
}
