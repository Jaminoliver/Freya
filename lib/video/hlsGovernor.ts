/**
 * hlsGovernor — caps how many HLS instances actually download segments at once.
 *
 * The problem this solves: VisibilityGate keeps many VideoPlayers mounted, and
 * each mounted player with an Hls instance will eagerly buffer ~10-15s of video
 * unless told not to. With 5-6 nearby videos all buffering, they starve each
 * other's bandwidth and nothing starts fast. This is the exact failure the
 * hls.js maintainer warns about: "limit how many active player or hls.js
 * instances are allowed to load at once."
 *
 * Model:
 *   • Every player registers an { startLoad, stopLoad } controller keyed by id.
 *   • The feed coordinator calls setAllowed(activeId, [id, id, ...]) with the
 *     small set permitted to download (active + N ahead).
 *   • The governor calls startLoad() on allowed players and stopLoad() on the
 *     rest. Players create their Hls instance with autoStartLoad:false so they
 *     download NOTHING until the governor promotes them.
 */

interface LoadController {
  startLoad: () => void;
  stopLoad:  () => void;
}

const controllers = new Map<string, LoadController>();
let allowedIds = new Set<string>();

export function registerHlsLoader(id: string, ctrl: LoadController) {
  controllers.set(id, ctrl);
  // If this id is already in the allowed set when it registers, start it.
  if (allowedIds.has(id)) {
    try { ctrl.startLoad(); } catch {}
  }
}

export function unregisterHlsLoader(id: string) {
  controllers.delete(id);
}

/** True if the given id is currently permitted to download segments. */
export function isLoadAllowed(id: string): boolean {
  return allowedIds.has(id);
}

/**
 * Set the small set of video ids permitted to download segments right now.
 * Promotes newly-allowed players (startLoad) and demotes the rest (stopLoad).
 */
export function setAllowedLoaders(ids: string[]) {
  const next = new Set(ids);

  // Demote anything no longer allowed.
  allowedIds.forEach((id) => {
    if (!next.has(id)) {
      const ctrl = controllers.get(id);
      if (ctrl) { try { ctrl.stopLoad(); } catch {} }
    }
  });

  // Promote newly allowed.
  next.forEach((id) => {
    if (!allowedIds.has(id)) {
      const ctrl = controllers.get(id);
      if (ctrl) { try { ctrl.startLoad(); } catch {} }
    }
  });

  allowedIds = next;
}

/** Clear all state (e.g. on user/feed switch). */
export function resetHlsGovernor() {
  allowedIds = new Set();
  controllers.clear();
}