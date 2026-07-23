/** Public-only Past/Present deck rotation. Admin intentionally sees both panes. */
export function initDeckToggle() {
  const swap = document.querySelector('.deck-swap');
  if (!swap) return;
  const tabs = [...document.querySelectorAll('.deck-toggle [data-deck-tab]')];
  const panes = [...swap.querySelectorAll('[data-deck-pane]')];
  const block = swap.closest('.masthead-deck-block') || swap;
  let active = 'past';
  let timer = null;
  let isHovered = false;

  const show = id => {
    if (id === active) return;
    active = id;
    tabs.forEach(tab => tab.classList.toggle('is-active', tab.dataset.deckTab === id));
    panes.forEach(pane => pane.classList.toggle('is-active', pane.dataset.deckPane === id));
  };
  const isUserHovering = () => isHovered || block.matches(':hover');
  const pause = () => {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  };
  const start = () => {
    if (!timer) timer = setInterval(() => {
      if (!isUserHovering()) show(active === 'past' ? 'present' : 'past');
    }, 10000);
  };
  const onEnter = () => {
    isHovered = true;
    pause();
  };
  const onLeave = () => {
    isHovered = false;
    start();
  };

  tabs.forEach(tab => tab.addEventListener('click', () => {
    pause();
    show(tab.dataset.deckTab);
    if (!isUserHovering()) start();
  }));
  block.addEventListener('mouseenter', onEnter);
  block.addEventListener('mouseleave', onLeave);
  block.addEventListener('pointerenter', onEnter);
  block.addEventListener('pointerleave', onLeave);
  start();
}
