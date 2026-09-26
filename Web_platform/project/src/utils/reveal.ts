export function revealStagger(index: number): number {
  return Math.min(index, 5) * 100;
}
