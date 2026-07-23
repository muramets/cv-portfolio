export const COMPACT_ROLE_COUNT = 3;
export const REVEAL_BATCH_SIZE = 3;

export const JOURNEY_PHASE = Object.freeze({
  COMPACT: 'compact',
  EXPANDED: 'expanded',
  COLLAPSING: 'collapsing',
});

export function getNextVisibleCount(visibleCount, totalCount) {
  return Math.min(totalCount, visibleCount + REVEAL_BATCH_SIZE);
}

export function getTimelineControlLabel(visibleCount, totalCount) {
  if (visibleCount >= totalCount) return 'Recent only ↑';
  if (visibleCount > COMPACT_ROLE_COUNT) return 'Another life ↓';
  return 'Earlier timeline ↓';
}

export function getFadingRoleIndex(visibleCount, totalCount) {
  return visibleCount < totalCount ? visibleCount - 1 : -1;
}
