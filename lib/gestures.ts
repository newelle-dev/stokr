// Pure gesture rules for the phone shell. Components only wire touch events to these.

export const PULL_THRESHOLD_PX = 72;

const EDGE_PX = 24;
const MIN_SWIPE_PX = 80;
const MAX_VERTICAL_DRIFT_PX = 60;

// 0 = nothing, 1 = far enough to refresh. Only counts when the page is scrolled to the very top.
export function pullProgress(startY: number, currentY: number, scrollTop: number): number {
  if (scrollTop > 0 || currentY <= startY) return 0;
  return Math.min((currentY - startY) / PULL_THRESHOLD_PX, 1);
}

export function isSwipeBack(startX: number, startY: number, endX: number, endY: number): boolean {
  return (
    startX <= EDGE_PX &&
    endX - startX >= MIN_SWIPE_PX &&
    Math.abs(endY - startY) < MAX_VERTICAL_DRIFT_PX
  );
}
