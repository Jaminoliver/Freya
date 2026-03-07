export function clampRatio(width: number, height: number): number {
  if (!width || !height || height === 0) return 4 / 3;
  return Math.min(Math.max(width / height, 0.5), 2.0);
}