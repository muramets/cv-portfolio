// Where the control's lower edge lands after the fold, as a fraction of the
// viewport height. ~0.48 places the Journey→Contact seam near the vertical
// centre: the last compact role shows only its tail above the fold, and Get in
// Touch is already arriving below — the deliberate compact composition.
const CONTROL_VIEWPORT_RATIO = 0.48;

/**
 * Measure the compact destination without changing the rendered state. The
 * control lives directly after the list, so shrinking the list moves it up by
 * exactly the removed height. This makes the control the viewport anchor —
 * never Journey's section edge and never Contact's own geometry.
 *
 * The returned `targetScroll` is absolute: it depends only on the compact
 * layout, not on where the visitor was scrolled when they clicked. It is
 * clamped to the post-collapse maxScroll so the fold animation, which walks
 * scroll and height on one clock, can never overshoot into a clamped frame.
 */
export function getCollapsePlan({ list, compactLastItem, control, viewportRatio = CONTROL_VIEWPORT_RATIO }) {
  if (!list || !compactLastItem || !control) return null;

  const listRect = list.getBoundingClientRect();
  const lastItemRect = compactLastItem.getBoundingClientRect();
  const controlRect = control.getBoundingClientRect();
  const expandedHeight = Math.round(listRect.height);
  const compactHeight = Math.round(lastItemRect.bottom - listRect.top);
  const heightDelta = expandedHeight - compactHeight;

  if (!Number.isFinite(heightDelta) || heightDelta <= 0) return null;

  const controlBottomAfterCollapse = window.scrollY + controlRect.bottom - heightDelta;
  const desiredControlBottom = window.innerHeight * viewportRatio;
  let targetScroll = Math.round(controlBottomAfterCollapse - desiredControlBottom);

  // Keep every animated frame within bounds: the deepest the page can scroll
  // once the collapse has removed `heightDelta` of document.
  const docHeight = typeof document !== 'undefined'
    ? document.documentElement.scrollHeight
    : Infinity;
  const finalMaxScroll = Math.max(0, Math.round(docHeight - heightDelta - window.innerHeight));
  targetScroll = Math.max(0, Math.min(targetScroll, finalMaxScroll));

  return {
    expandedHeight,
    compactHeight,
    heightDelta,
    targetScroll,
  };
}
