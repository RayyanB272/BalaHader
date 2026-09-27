const KEY = "balahader_favorites";
const EVENT = "balahader-favorites-changed";

export function getFavoriteIds(): string[] {
  try { const value = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
export function isFavorite(id: string) { return getFavoriteIds().includes(id); }
export function toggleFavorite(id: string) {
  const current = getFavoriteIds();
  const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
  return next.includes(id);
}
export function subscribeFavorites(listener: () => void) {
  window.addEventListener(EVENT, listener); window.addEventListener("storage", listener);
  return () => { window.removeEventListener(EVENT, listener); window.removeEventListener("storage", listener); };
}
