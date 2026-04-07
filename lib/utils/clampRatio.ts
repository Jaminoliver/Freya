export function clampRatio(width: number, height: number): number {
  if (!width || !height || height === 0) return 1;
  return Math.min(Math.max(width / height, 0.8), 1.91);
}