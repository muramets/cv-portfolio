import {
  COMPACT_ROLE_COUNT,
  JOURNEY_PHASE,
  getFadingRoleIndex,
  getNextVisibleCount,
  getTimelineControlLabel,
} from './timeline-state.js';
import { getCollapsePlan } from './timeline-geometry.js';
import { mountTimelineGlow } from './timeline-glow.js';

const REVEAL_DURATION_MS = 520;
const FOLD_DURATION_MS = 1500;
// Longest dissolve edge trailing the clipping boundary. It is only ever this
// tall while roles are still being eaten; it shrinks to zero as the list
// reaches its compact height, so the three surviving roles are never masked.
const FOLD_FADE_MAX = 260;
const MOTION_CURVE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
const foldEase = t => (t < 0.5
  ? 4 * t * t * t
  : 1 - Math.pow(-2 * t + 2, 3) / 2);

const noOpController = Object.freeze({
  destroy() {},
  refresh() {},
  get phase() { return JOURNEY_PHASE.COMPACT; },
});

/**
 * Mount public Journey disclosure behaviour onto already-rendered role cards.
 * Rendering and admin editing stay in entities.js/admin.js; this component
 * owns only visitor interaction, geometry and temporary scroll coordination.
 */
export function mountJourneyTimeline({
  section = document.querySelector('.section--journey'),
  getLenis = () => null,
  isWebKitSafari = false,
} = {}) {
  const list = section?.querySelector('.timeline-list');
  if (!section || !list) return noOpController;

  let items = Array.from(list.querySelectorAll('.timeline-item'));
  if (items.length <= COMPACT_ROLE_COUNT) return noOpController;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const returnCueListeners = new Map();
  const timelineSurface = list.closest('.journey-layout__timeline');
  let phase = JOURNEY_PHASE.COMPACT;
  let visibleCount = COMPACT_ROLE_COUNT;
  let foldToken = 0;
  let lenisPausedForFold = false;
  let destroyed = false;

  const control = document.createElement('button');
  control.type = 'button';
  control.className = 'timeline-expand';
  control.textContent = getTimelineControlLabel(visibleCount, items.length);
  control.setAttribute('aria-controls', ensureListId(list));
  list.after(control);

  const glow = mountTimelineGlow({
    surface: timelineSurface,
    isWebKitSafari,
    isFolding: () => phase === JOURNEY_PHASE.COLLAPSING,
  });

  function ensureListId(node) {
    if (!node.id) node.id = 'journey-timeline';
    return node.id;
  }

  function setControlState() {
    control.setAttribute('aria-expanded', String(visibleCount >= items.length));
    control.textContent = getTimelineControlLabel(visibleCount, items.length);
  }

  function clearReturnCue(role, resetVisual = false) {
    const activate = returnCueListeners.get(role);
    if (activate) role.removeEventListener('pointerenter', activate);
    returnCueListeners.delete(role);
    if (resetVisual) role.classList.remove('is-timeline-attention-pending');
  }

  function setReturnCue(role) {
    items.forEach(item => clearReturnCue(item, true));
    if (!role) return;
    role.classList.add('is-timeline-attention-pending');
    const activate = () => {
      role.classList.remove('is-timeline-attention-pending');
      returnCueListeners.delete(role);
    };
    returnCueListeners.set(role, activate);
    role.addEventListener('pointerenter', activate, { once: true });
  }

  function updateRailFade(count = visibleCount) {
    const fadingIndex = getFadingRoleIndex(count, items.length);
    const fadingRole = items[fadingIndex] || null;
    items.forEach((item, index) => {
      item.classList.toggle('is-timeline-fading', index === fadingIndex);
    });
    if (!fadingRole) {
      list.style.removeProperty('--timeline-rail-fade-start');
      list.style.removeProperty('--timeline-rail-fade-end');
      return;
    }
    const listTop = list.getBoundingClientRect().top;
    const roleRect = fadingRole.getBoundingClientRect();
    const bullets = fadingRole.querySelector('.timeline-bullets');
    const bulletsTop = bullets?.getBoundingClientRect().top ?? roleRect.top + roleRect.height * 0.29;
    const fadeStart = Math.max(0, Math.round(bulletsTop - listTop));
    const fadeEnd = Math.max(fadeStart + 1, Math.round(roleRect.bottom - listTop));
    list.style.setProperty('--timeline-rail-fade-start', `${fadeStart}px`);
    list.style.setProperty('--timeline-rail-fade-end', `${fadeEnd}px`);
  }

  function renderVisibleItems() {
    items.forEach((item, index) => {
      item.style.display = index < visibleCount ? '' : 'none';
    });
    list.classList.toggle('has-fade', visibleCount < items.length);
    updateRailFade();
    setControlState();
  }

  function revealItems(from, to) {
    for (let index = from; index < to; index++) {
      const item = items[index];
      if (!item) continue;
      item.style.display = '';
      if (reducedMotion) continue;
      item.classList.add('is-revealing');
      item.style.animationDelay = `${(index - from) * 60}ms`;
      item.addEventListener('animationend', () => {
        item.classList.remove('is-revealing');
        item.style.animationDelay = '';
      }, { once: true });
    }
  }

  function animateListHeight(fromHeight, toHeight) {
    if (fromHeight === toHeight) return Promise.resolve();
    list.classList.add('is-resizing');
    list.style.height = `${fromHeight}px`;
    list.style.overflow = 'hidden';
    list.style.transition = 'none';
    return new Promise(resolve => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        list.removeEventListener('transitionend', onTransitionEnd);
        window.clearTimeout(fallback);
        list.classList.remove('is-resizing');
        list.style.height = list.style.overflow = list.style.transition = '';
        getLenis()?.resize?.();
        resolve();
      };
      const onTransitionEnd = event => {
        if (event.target === list && event.propertyName === 'height') finish();
      };
      const fallback = window.setTimeout(finish, REVEAL_DURATION_MS + 100);
      list.addEventListener('transitionend', onTransitionEnd);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        list.style.transition = `height ${REVEAL_DURATION_MS}ms ${MOTION_CURVE}`;
        list.style.height = `${toHeight}px`;
      }));
    });
  }

  // Lenis proxies the window scroll: native `window.scrollTo` is silently
  // reverted to Lenis's own animated target every frame. So every scroll write
  // during the fold has to go through Lenis (`force` bypasses the paused
  // guard). Without Lenis — reduced motion, coarse pointer — the native path
  // works untouched.
  function applyScroll(y) {
    const lenis = getLenis();
    if (lenis?.scrollTo) lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  }

  function pauseLenisForFold() {
    const lenis = getLenis();
    if (!lenis?.stop) return;
    lenis.stop();
    lenisPausedForFold = true;
  }

  function resumeLenisAfterFold(targetScroll) {
    if (!lenisPausedForFold) return;
    const lenis = getLenis();
    try {
      // The document changed height; Lenis must re-read its bounds and adopt
      // the position we already hold, so starting it triggers no motion.
      lenis?.resize?.();
      lenis?.scrollTo?.(targetScroll ?? window.scrollY, { immediate: true, force: true });
    } finally {
      lenisPausedForFold = false;
      lenis?.start?.();
    }
  }

  /**
   * Collapse the list toward its compact height while the viewport travels to
   * the plan's absolute `targetScroll`. Height and scroll advance on one eased
   * clock, written the same frame through the same scroll owner (Lenis), so the
   * scroll tracks the shrink exactly — the Journey section never gets shorter
   * than the scroll can follow, which is what keeps the sticky intro pinned
   * instead of bottom-releasing and flying off. The last frame lands the list
   * at compact height and the scroll on `targetScroll`; the DOM commit that
   * follows is pixel-identical, so there is no post-animation jump.
   */
  function animateCollapse(plan) {
    const startScroll = window.scrollY;
    const token = ++foldToken;
    list.classList.add('is-resizing');
    list.style.height = `${plan.expandedHeight}px`;
    list.style.overflow = 'hidden';
    list.style.transition = 'none';
    pauseLenisForFold();

    return new Promise(resolve => {
      const startedAt = performance.now();
      const step = now => {
        if (destroyed || token !== foldToken) {
          resolve();
          return;
        }
        const progress = Math.min(1, (now - startedAt) / FOLD_DURATION_MS);
        const eased = foldEase(progress);
        const height = Math.round(plan.expandedHeight - plan.heightDelta * eased);
        const scroll = Math.round(startScroll + (plan.targetScroll - startScroll) * eased);
        list.style.height = `${height}px`;
        // The dissolve trails the clipping edge but collapses to zero as the
        // list reaches compact height, so the three surviving roles — and
        // their bullets — are never faded.
        const fade = Math.max(0, Math.min(FOLD_FADE_MAX, height - plan.compactHeight));
        list.style.setProperty('--timeline-collapse-fade', `${fade}px`);
        applyScroll(scroll);
        if (progress < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  async function revealNextRoles() {
    const previousCount = visibleCount;
    const fromHeight = reducedMotion ? 0 : list.offsetHeight;
    const contextRole = items[previousCount - 1];
    visibleCount = getNextVisibleCount(visibleCount, items.length);
    revealItems(previousCount, visibleCount);
    list.classList.toggle('has-fade', visibleCount < items.length);
    updateRailFade();
    setControlState();
    if (reducedMotion) return;

    phase = JOURNEY_PHASE.EXPANDED;
    document.documentElement.style.overflowAnchor = 'none';
    setReturnCue(contextRole);
    await animateListHeight(fromHeight, list.scrollHeight);
    document.documentElement.style.overflowAnchor = '';
  }

  async function collapseToCompact() {
    items.forEach(item => clearReturnCue(item, true));

    const plan = getCollapsePlan({
      list,
      compactLastItem: items[COMPACT_ROLE_COUNT - 1],
      control,
    });

    if (reducedMotion) {
      visibleCount = COMPACT_ROLE_COUNT;
      renderVisibleItems();
      // Land on the same composed position, just without the motion.
      if (plan) applyScroll(plan.targetScroll);
      phase = JOURNEY_PHASE.COMPACT;
      return;
    }

    if (!plan) return;

    const originalOverflowAnchor = document.documentElement.style.overflowAnchor;
    phase = JOURNEY_PHASE.COLLAPSING;
    document.documentElement.style.overflowAnchor = 'none';
    list.classList.add('has-fade', 'is-collapsing');
    updateRailFade(COMPACT_ROLE_COUNT);
    document.body.classList.add('is-journey-collapsing', 'is-timeline-folding');
    window.dispatchEvent(new Event('timelinefoldstart'));

    try {
      await animateCollapse(plan);
      // Commit the compact DOM while the list is still height-constrained to
      // compactHeight: roles 4-9 are hidden before the inline height is
      // released, so clearing it exposes the identical compact layout with no
      // intermediate full-height frame. The scroll already rests on
      // targetScroll from the final animation frame — nothing jumps.
      visibleCount = COMPACT_ROLE_COUNT;
      renderVisibleItems();
      list.classList.remove('is-resizing', 'is-collapsing');
      list.style.height = list.style.overflow = list.style.transition = '';
      list.style.removeProperty('--timeline-collapse-fade');
      phase = JOURNEY_PHASE.COMPACT;
    } finally {
      foldToken++;
      list.classList.remove('is-resizing', 'is-collapsing');
      document.body.classList.remove('is-journey-collapsing', 'is-timeline-folding');
      document.documentElement.style.overflowAnchor = originalOverflowAnchor;
      resumeLenisAfterFold(plan.targetScroll);
      window.dispatchEvent(new Event('timelinefoldend'));
    }
  }

  const onControlClick = () => {
    if (destroyed || phase === JOURNEY_PHASE.COLLAPSING) return;
    if (visibleCount >= items.length) void collapseToCompact();
    else void revealNextRoles();
  };
  const onResize = () => requestAnimationFrame(() => updateRailFade());

  control.addEventListener('click', onControlClick);
  window.addEventListener('resize', onResize, { passive: true });
  renderVisibleItems();

  return {
    get phase() { return phase; },
    refresh() {
      if (phase === JOURNEY_PHASE.COLLAPSING) return;
      const previousTotal = items.length;
      items = Array.from(list.querySelectorAll('.timeline-item'));
      if (items.length <= COMPACT_ROLE_COUNT) {
        control.remove();
        return;
      }
      visibleCount = visibleCount >= previousTotal
        ? items.length
        : Math.min(visibleCount, items.length);
      renderVisibleItems();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      foldToken++;
      items.forEach(item => clearReturnCue(item, true));
      control.removeEventListener('click', onControlClick);
      window.removeEventListener('resize', onResize);
      glow.destroy();
      control.remove();
      list.classList.remove('is-resizing', 'is-collapsing', 'has-fade');
      list.style.height = list.style.overflow = list.style.transition = '';
      document.body.classList.remove('is-journey-collapsing', 'is-timeline-folding');
      resumeLenisAfterFold();
    },
  };
}
