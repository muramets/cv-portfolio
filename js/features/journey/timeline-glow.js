/** Decorative pointer-following glow. It deliberately owns only its own
 * listeners and DOM so disclosure state never leaks into the effect. */
export function mountTimelineGlow({ surface, isWebKitSafari, isFolding }) {
  const canUseGlow = surface
    && !isWebKitSafari
    && matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!canUseGlow) return { destroy() {} };

  let glowLayer = surface.querySelector('.timeline-glow-layer');
  if (!glowLayer) {
    glowLayer = document.createElement('div');
    glowLayer.className = 'timeline-glow-layer';
    glowLayer.innerHTML = '<div class="timeline-glow-primary"></div><div class="timeline-glow-secondary"></div>';
    surface.prepend(glowLayer);
  }

  const primaryGlow = glowLayer.querySelector('.timeline-glow-primary');
  const secondaryGlow = glowLayer.querySelector('.timeline-glow-secondary');
  const glowFollowTime = 82;
  let glowFrame = null;
  let scrollFrame = null;
  let lastGlowTime = 0;
  let lastPointer = null;
  let surfaceRect = null;
  let targetGlow = null;
  let currentGlow = null;
  let primaryHalfWidth = 340;
  let primaryHalfHeight = 260;
  let secondaryHalfWidth = 280;
  let secondaryHalfHeight = 220;

  const refreshSurfaceRect = () => {
    surfaceRect = surface.getBoundingClientRect();
  };
  const refreshGlowDimensions = () => {
    primaryHalfWidth = (primaryGlow?.offsetWidth / 2) || 340;
    primaryHalfHeight = (primaryGlow?.offsetHeight / 2) || 260;
    secondaryHalfWidth = (secondaryGlow?.offsetWidth / 2) || 280;
    secondaryHalfHeight = (secondaryGlow?.offsetHeight / 2) || 220;
  };
  const getGlowPoint = point => {
    const rect = surfaceRect || (surfaceRect = surface.getBoundingClientRect());
    const insetX = Math.min(220, rect.width * 0.24);
    const insetY = Math.min(180, rect.height * 0.15);
    return {
      x: Math.max(insetX, Math.min(rect.width - insetX, point.x - rect.left)),
      y: Math.max(insetY, Math.min(rect.height - insetY, point.y - rect.top)),
    };
  };
  const applyGlowPoint = point => {
    if (primaryGlow) {
      primaryGlow.style.transform = `translate3d(${(point.x - primaryHalfWidth).toFixed(1)}px, ${(point.y - primaryHalfHeight).toFixed(1)}px, 0)`;
    }
    if (secondaryGlow) {
      secondaryGlow.style.transform = `translate3d(${(point.x - secondaryHalfWidth - 56).toFixed(1)}px, ${(point.y - secondaryHalfHeight + 30).toFixed(1)}px, 0)`;
    }
    surface.classList.add('is-timeline-exploring');
  };
  const renderGlow = now => {
    glowFrame = null;
    if (!targetGlow) return;
    if (!currentGlow) currentGlow = { ...targetGlow };
    const elapsed = lastGlowTime ? Math.min(64, now - lastGlowTime) : 16.7;
    lastGlowTime = now;
    const follow = 1 - Math.exp(-elapsed / glowFollowTime);
    currentGlow.x += (targetGlow.x - currentGlow.x) * follow;
    currentGlow.y += (targetGlow.y - currentGlow.y) * follow;
    const remaining = Math.hypot(targetGlow.x - currentGlow.x, targetGlow.y - currentGlow.y);
    if (remaining < 0.15) currentGlow = targetGlow;
    applyGlowPoint(currentGlow);
    if (remaining >= 0.15) glowFrame = requestAnimationFrame(renderGlow);
  };
  const setGlowTarget = point => {
    if (isFolding()) return;
    lastPointer = point;
    targetGlow = getGlowPoint(point);
    if (!currentGlow) {
      currentGlow = { ...targetGlow };
      applyGlowPoint(currentGlow);
    }
    if (!glowFrame) glowFrame = requestAnimationFrame(renderGlow);
  };
  const clearGlow = () => {
    if (glowFrame !== null) cancelAnimationFrame(glowFrame);
    if (scrollFrame !== null) cancelAnimationFrame(scrollFrame);
    glowFrame = null;
    scrollFrame = null;
    targetGlow = null;
    currentGlow = null;
    lastGlowTime = 0;
    lastPointer = null;
    surfaceRect = null;
    surface.classList.remove('is-timeline-exploring');
  };
  const onPointerEnter = event => {
    if (isFolding()) return;
    refreshSurfaceRect();
    setGlowTarget({ x: event.clientX, y: event.clientY });
  };
  const onPointerMove = event => {
    if (!isFolding()) setGlowTarget({ x: event.clientX, y: event.clientY });
  };
  const onScroll = () => {
    if (isFolding()) {
      clearGlow();
      return;
    }
    if (!lastPointer || scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = null;
      if (!lastPointer) return;
      refreshSurfaceRect();
      setGlowTarget(lastPointer);
    });
  };
  const onResize = () => {
    refreshGlowDimensions();
    onScroll();
  };

  refreshGlowDimensions();
  surface.addEventListener('pointerenter', onPointerEnter);
  surface.addEventListener('pointermove', onPointerMove, { passive: true });
  surface.addEventListener('pointerleave', clearGlow);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('timelinefoldstart', clearGlow);
  window.addEventListener('resize', onResize, { passive: true });

  return {
    destroy() {
      clearGlow();
      surface.removeEventListener('pointerenter', onPointerEnter);
      surface.removeEventListener('pointermove', onPointerMove);
      surface.removeEventListener('pointerleave', clearGlow);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('timelinefoldstart', clearGlow);
      window.removeEventListener('resize', onResize);
    },
  };
}
