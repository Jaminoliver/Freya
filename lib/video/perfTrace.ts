/**
 * perfTrace — TEMPORARY video startup telemetry (research mode).
 *
 * Records a per-video timeline of the startup pipeline so we can see exactly
 * where time is spent: viewport → prewarm → manifest → active → play → frame.
 *
 * Remove once the pipeline is diagnosed. All output is prefixed [VPERF].
 *
 * Usage:
 *   import { vmark } from "@/lib/video/perfTrace";
 *   vmark(bunnyVideoId, "mount");
 *   vmark(bunnyVideoId, "first_frame");  // logs the full timeline
 */

type Stage =
  | "mount"          // VideoPlayer mounted
  | "prewarm_start"  // initVideo() called via prewarm (in-window)
  | "manifest_req"   // hls.loadSource() called
  | "load_allowed"   // governor permitted segment download
  | "active"         // autoPlay flipped true (became centered)
  | "play_call"      // video.play() invoked
  | "canplay"        // readyState reached HAVE_FUTURE_DATA
  | "first_frame";   // 'playing' event — first visible frame

interface Timeline {
  startedAt: number;            // first mark time
  stages: Partial<Record<Stage, number>>;
  prewarmed: boolean;
  logged: boolean;
}

const ENABLED = true; // flip to false to silence without removing marks

const timelines = new Map<string, Timeline>();

function short(id: string): string {
  return id ? id.slice(0, 8) : "????????";
}

export function vmark(videoId: string | null | undefined, stage: Stage) {
  if (!ENABLED || !videoId) return;
  const now = performance.now();

  let t = timelines.get(videoId);
  if (!t) {
    t = { startedAt: now, stages: {}, prewarmed: false, logged: false };
    timelines.set(videoId, t);
  }

  // First time we see this stage wins (ignore duplicates).
  if (t.stages[stage] === undefined) {
    t.stages[stage] = now;
  }

  if (stage === "prewarm_start" || stage === "manifest_req") {
    // If manifest was requested before "active", this video was prewarmed.
    if (t.stages["active"] === undefined) t.prewarmed = true;
  }

  if (stage === "first_frame" && !t.logged) {
    t.logged = true;
    logTimeline(videoId, t);
  }
}

function span(t: Timeline, a: Stage, b: Stage): string {
  const ta = t.stages[a];
  const tb = t.stages[b];
  if (ta === undefined || tb === undefined) return "—";
  return `${Math.round(tb - ta)}ms`;
}

function logTimeline(videoId: string, t: Timeline) {
  const s = t.stages;
  const total = s["first_frame"] !== undefined && s["mount"] !== undefined
    ? Math.round(s["first_frame"]! - s["mount"]!)
    : "—";

  // The number that matters most: from becoming active to first frame.
  const activeToFrame = span(t, "active", "first_frame");

  const parts: string[] = [
    `mount→active ${span(t, "mount", "active")}`,
    `active→play ${span(t, "active", "play_call")}`,
    `play→canplay ${span(t, "play_call", "canplay")}`,
    `canplay→frame ${span(t, "canplay", "first_frame")}`,
    `active→FRAME ${activeToFrame}`,
    `TOTAL mount→frame ${total}ms`,
    `prewarmed: ${t.prewarmed ? "YES" : "NO"}`,
  ];

  // Color: green if active→frame was fast (prewarm working), red if slow.
  const af = s["active"] !== undefined && s["first_frame"] !== undefined
    ? s["first_frame"]! - s["active"]!
    : Infinity;
  const color = af < 400 ? "#10B981" : af < 1000 ? "#F59E0B" : "#EF4444";

  // eslint-disable-next-line no-console
  console.log(`%c[VPERF] ${short(videoId)} | ${parts.join(" | ")}`, `color:${color};font-weight:bold`);

  // Clean up so a re-watch later starts fresh.
  timelines.delete(videoId);
}

/** Reset all timelines (e.g. on feed/user switch). */
export function resetPerfTrace() {
  timelines.clear();
}