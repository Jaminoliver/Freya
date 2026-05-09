export function remoteLog(tag: string, data?: any) {
  try {
    fetch("/api/debug/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tag,
        data,
        ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
        ts: new Date().toISOString(),
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}