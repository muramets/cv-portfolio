// Impact scene interaction kept separate from the page bootstrap.

/* Cards remain genuinely live during a scroll. When the composition travels
   beneath a resting cursor, hit-testing promotes whichever tile reaches that
   point — exactly like direct hover, with no invented "intent" gate. */
export function initScrollInteractionFeedback() {
  let lastPointer = null;
  let hoveredTile = null;
  let hoverFrame = null;
  const impactChapter = document.querySelector('.scroll-chapter--impact');
  let impactTop = 0;
  let impactHeight = 0;
  let impactTileRects = [];
  let lastScrollY = window.scrollY;
  let scrollDirection = 0;
  let lastScrollAt = 0;

  const refreshImpactBounds = () => {
    if (!impactChapter) return;
    const rect = impactChapter.getBoundingClientRect();
    impactTop = window.scrollY + rect.top;
    impactHeight = impactChapter.offsetHeight;
    const tiles = Array.from(impactChapter.querySelectorAll('.story-tile'));
    impactTileRects = tiles.map(tile => {
      const r = tile.getBoundingClientRect();
      return {
        el: tile,
        top: r.top + window.scrollY,
        bottom: r.bottom + window.scrollY,
        left: r.left,
        right: r.right,
      };
    });
  };
  const isImpactActive = () => {
    if (!impactChapter) return false;
    const viewportBottom = window.scrollY + window.innerHeight;
    return viewportBottom >= impactTop - 96 && window.scrollY <= impactTop + impactHeight + 96;
  };
  refreshImpactBounds();
  window.addEventListener('resize', () => {
    window.requestAnimationFrame(refreshImpactBounds);
  }, { passive: true });

  const getImpactProgress = () => {
    if (!impactChapter) return null;
    return (window.scrollY - (impactTop - window.innerHeight))
      / (impactHeight + window.innerHeight);
  };

  const releaseLockedFeaturedHover = () => {
    const featured = document.querySelector('.scroll-chapter__content .story-tile.featured.mint.is-hover-locked');
    if (!featured) return;

    const progress = getImpactProgress();
    if (progress === null) return;
    // The retained visual belongs to the closing pass only. A fully closed
    // door resets it; a new forward pass returns control to normal hover.
    if (progress <= 0.20 || (scrollDirection > 0 && progress > 0.20)) {
      featured.classList.remove('is-hover-locked');
    }
  };

  const resetFeaturedHoverAtClosedDoors = () => {
    const progress = getImpactProgress();
    if (progress === null || progress > 0.272) return;

    const featured = document.querySelector('.scroll-chapter__content .story-tile.featured.mint');
    if (!featured) return;
    featured.classList.remove('is-hover-primed', 'is-hover-locked', 'has-hover-intent');
    if (hoveredTile === featured) hoveredTile = null;
  };

  const lockFeaturedHoverWhileClosing = tile => {
    if (!tile?.matches('.featured.mint.is-hover-primed')) return;
    if (scrollDirection >= 0 || performance.now() - lastScrollAt > 140) return;

    const progress = getImpactProgress();
    if (progress !== null && progress > 0.20) tile.classList.add('is-hover-locked');
  };

  const activateCardHover = tile => {
    if (!tile) return;
    tile.classList.add('has-hover-intent');
    if (tile.matches('.featured.mint')) tile.classList.add('is-hover-primed');
  };

  const syncHoverAtPointer = () => {
    hoverFrame = null;
    if (!isImpactActive()) return;
    let nextTile = null;
    if (lastPointer) {
      const pageY = lastPointer.y + window.scrollY;
      const match = impactTileRects.find(t =>
        lastPointer.x >= t.left && lastPointer.x <= t.right &&
        pageY >= t.top && pageY <= t.bottom
      );
      nextTile = match ? match.el : null;
    }
    if (hoveredTile && hoveredTile !== nextTile) {
      lockFeaturedHoverWhileClosing(hoveredTile);
      hoveredTile.classList.remove('has-hover-intent');
    }
    if (nextTile) activateCardHover(nextTile);
    hoveredTile = nextTile;
  };

  const requestHoverSync = () => {
    // The only cards managed here live in Impact. Skipping hit-testing outside
    // that chapter keeps Journey's disclosure animation free of extra work.
    if (!isImpactActive()) return;
    if (hoverFrame !== null) return;
    hoverFrame = requestAnimationFrame(syncHoverAtPointer);
  };

  const isFinePointer = event => event.pointerType === 'mouse' || event.pointerType === 'pen';

  document.addEventListener('pointermove', event => {
    if (!isFinePointer(event)) return;
    lastPointer = { x: event.clientX, y: event.clientY };
    requestHoverSync();
  }, { passive: true });

  document.addEventListener('pointerover', event => {
    if (!isFinePointer(event)) return;
    lastPointer = { x: event.clientX, y: event.clientY };
    requestHoverSync();
  });

  document.addEventListener('pointerout', event => {
    const tile = event.target.closest('.story-tile');
    if (!tile || tile.contains(event.relatedTarget)) return;
    lockFeaturedHoverWhileClosing(tile);
    tile.classList.remove('has-hover-intent');
    if (hoveredTile === tile) hoveredTile = null;
  });

  // Scrolling does not suppress hover: the card arriving below a stationary
  // cursor is intentionally allowed to become the active card.
  window.addEventListener('scroll', () => {
    if (!isImpactActive()) {
      if (hoveredTile) hoveredTile.classList.remove('has-hover-intent');
      hoveredTile = null;
      return;
    }
    const current = window.scrollY;
    if (Math.abs(current - lastScrollY) > 0.5) {
      scrollDirection = current > lastScrollY ? 1 : -1;
      lastScrollAt = performance.now();
    }
    lastScrollY = current;
    releaseLockedFeaturedHover();
    resetFeaturedHoverAtClosedDoors();
    requestHoverSync();
  }, { passive: true });

  return { sync: requestHoverSync };
}

/** A small, local landing assist for the Impact sticky scene. The section
 * owns this behaviour; the page bootstrap only supplies its scroll engine. */
export function initImpactSoftSettle({ getLenis, easing }) {
  const chapter = document.querySelector('.scroll-chapter--impact');
  const hasFinePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!chapter || !hasFinePointer || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const openProgress = 0.64;
  const closedProgress = 0.27;
  let top = 0;
  let height = 0;
  let timer = null;
  let isSettling = false;
  let lastScroll = window.scrollY;
  let direction = 0;

  const refreshBounds = () => {
    top = window.scrollY + chapter.getBoundingClientRect().top;
    height = chapter.offsetHeight;
  };
  const targetFor = progress => top - window.innerHeight + (height + window.innerHeight) * progress;
  const progress = () => (window.scrollY - (top - window.innerHeight)) / (height + window.innerHeight);
  const cancel = () => {
    isSettling = false;
    window.clearTimeout(timer);
  };
  const settle = () => {
    timer = null;
    if (isSettling) return;
    const currentProgress = progress();
    const targetProgress = direction < 0 ? closedProgress : openProgress;
    const target = targetFor(targetProgress);
    const approaching = (direction > 0 && currentProgress >= 0.275 && currentProgress < openProgress)
      || (direction < 0 && currentProgress <= 0.59 && currentProgress > closedProgress);
    if (!approaching || Math.abs(target - window.scrollY) < 3) return;
    isSettling = true;
    const complete = () => { isSettling = false; };
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(target, { duration: 0.9, easing, onComplete: complete });
    else {
      window.scrollTo({ top: target, behavior: 'smooth' });
      window.setTimeout(complete, 650);
    }
  };
  const onScroll = () => {
    const current = window.scrollY;
    if (Math.abs(current - lastScroll) > 0.5) direction = current > lastScroll ? 1 : -1;
    lastScroll = current;
    if (isSettling) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(settle, 120);
  };

  refreshBounds();
  window.addEventListener('resize', () => requestAnimationFrame(refreshBounds), { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('wheel', cancel, { passive: true });
  window.addEventListener('touchstart', cancel, { passive: true });
  document.addEventListener('keydown', cancel);
}
