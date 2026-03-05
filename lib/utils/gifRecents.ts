const RECENTS_KEY = "freya_gif_recents";
const MAX_RECENTS = 20;

export interface GifItem {
  id: string;
  title: string;
  url: string;
  preview_url: string;
}

export function getRecentGifs(): GifItem[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentGif(gif: GifItem): void {
  try {
    const existing = getRecentGifs().filter((g) => g.id !== gif.id);
    const updated  = [gif, ...existing].slice(0, MAX_RECENTS);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
  } catch {}
}

export function removeRecentGif(gifId: string): void {
  try {
    const updated = getRecentGifs().filter((g) => g.id !== gifId);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
  } catch {}
}

export function clearRecentGifs(): void {
  try {
    localStorage.removeItem(RECENTS_KEY);
  } catch {}
}