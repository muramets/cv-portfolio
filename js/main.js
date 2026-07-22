// Bootstrap: remote content → auth → texts → collections →
// (admin UI if authorized).

import { initAuth, isAdmin, login, logout } from './auth.js?v=40';
import { initStore } from './store.js?v=40';
import { renderPage, applyTexts, applyBlockOrder, applyFooterColOrder, pruneEmptyNav } from './render.js?v=40';

// Cold load has no inbound view transition (nothing to morph from) —
// give it a one-time entrance fade instead. Navigations between pages
// are handled by the cross-document view transitions in motion.css.
window.addEventListener('pagereveal', e => {
  if (!e.viewTransition) document.documentElement.classList.add('is-first-load');
});

// Cmd/Ctrl+Shift+A toggles admin mode (same effect as ?admin=on/off)
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyA') {
    e.preventDefault();
    isAdmin() ? logout() : login();
  }
});

await initStore(); // published content must be in place before render

initAuth();
applyTexts();
applyBlockOrder();
applyFooterColOrder();
const state = renderPage();

if (isAdmin()) {
  const { initAdmin } = await import('./admin.js?v=40');
  initAdmin(state);
} else {
  pruneEmptyNav(); // hide links to pages that have nothing on them yet
  initDeckToggle();
  initTimelineCollapse();
}
initContactForm();

// Prevent browser scroll restoration jumps during dynamic JS hydration
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

// Smooth scroll handler for anchor links
document.addEventListener('click', e => {
  const anchor = e.target.closest('a[href^="#"]');
  if (!anchor) return;
  const targetId = anchor.getAttribute('href').slice(1);
  if (!targetId) return;
  const targetEl = document.getElementById(targetId);
  if (targetEl) {
    e.preventDefault();
    targetEl.scrollIntoView({ behavior: 'smooth' });
    history.pushState(null, '', `#${targetId}`);
  }
});

/* Professional Journey: visitors get the three most recent roles; the
   earlier ones wait behind a fade and expand by 3 cards at a time.
   Button text progresses: "Earlier timeline ↓" → "Another life ↓" → "Recent only ↑".
   Collapsing uses a non-destructive dual-motion animation to fold the list and
   bring Get in Touch into focus seamlessly. */
function initTimelineCollapse() {
  const list = document.querySelector('.timeline-list');
  const items = list ? Array.from(list.querySelectorAll('.timeline-item')) : [];
  if (!list || items.length <= 3) return;

  let visibleCount = 3;

  function updateVisibility() {
    items.forEach((item, index) => {
      item.style.display = index < visibleCount ? '' : 'none';
    });
    list.classList.toggle('has-fade', visibleCount < items.length);
  }

  // Initial state: show first 3 items with bottom fade
  updateVisibility();

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'timeline-expand';
  btn.textContent = 'Earlier timeline ↓';
  list.after(btn);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function getButtonText(count) {
    if (count >= items.length) return 'Recent only ↑';
    if (count > 3) return 'Another life ↓';
    return 'Earlier timeline ↓';
  }

  function swapButtonText(newText) {
    if (btn.textContent === newText) return;
    if (reduced) { btn.textContent = newText; return; }

    btn.classList.add('is-swapping');
    setTimeout(() => {
      btn.textContent = newText;
      btn.classList.remove('is-swapping');
      btn.classList.add('is-swapped-pulse');
      setTimeout(() => btn.classList.remove('is-swapped-pulse'), 300);
    }, 150);
  }

  function runHeight(from, to, done) {
    list.style.height = from + 'px';
    list.style.overflow = 'hidden';
    void list.offsetHeight; // flush, so the next height change transitions
    list.style.transition = 'height 500ms cubic-bezier(0.4, 0, 0.2, 1)';
    list.style.height = to + 'px';
    list.addEventListener('transitionend', function clear(e) {
      if (e.propertyName !== 'height') return;
      list.removeEventListener('transitionend', clear);
      list.style.height = list.style.overflow = list.style.transition = '';
      done?.();
    });
  }

  function expandNext() {
    const from = list.offsetHeight;
    const prevCount = visibleCount;
    visibleCount = Math.min(items.length, visibleCount + 3);

    const FADE_H = 140; // keep in sync with .timeline-list.has-fade::after
    const unseenTopViewport = list.getBoundingClientRect().bottom - FADE_H;

    for (let i = prevCount; i < visibleCount; i++) {
      if (items[i]) items[i].style.display = '';
    }
    list.classList.toggle('has-fade', visibleCount < items.length);

    const to = list.offsetHeight;

    if (!reduced) {
      document.documentElement.style.overflowAnchor = 'none';

      const startScrollY = window.scrollY;
      const targetScrollY = Math.max(0, startScrollY + unseenTopViewport - 100);

      const duration = 500;
      const startTime = performance.now();
      list.style.overflow = 'hidden';

      for (let i = prevCount; i < visibleCount; i++) {
        const item = items[i];
        if (!item) continue;
        item.classList.add('is-revealing');
        item.style.animationDelay = (i - prevCount) * 70 + 'ms';
        item.addEventListener('animationend', () => {
          item.classList.remove('is-revealing');
          item.style.animationDelay = '';
        }, { once: true });
      }

      function animate(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = 1 - Math.pow(1 - progress, 3);

        const currentH = from + (to - from) * ease;
        list.style.height = currentH + 'px';

        if (Math.abs(targetScrollY - startScrollY) > 2) {
          window.scrollTo(0, startScrollY + (targetScrollY - startScrollY) * ease);
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          list.style.height = list.style.overflow = '';
          document.documentElement.style.overflowAnchor = '';
        }
      }

      requestAnimationFrame(animate);
    }

    swapButtonText(getButtonText(visibleCount));
  }

  function collapseToRecent() {
    const from = list.offsetHeight;
    const thirdItem = items[2];

    const listRect = list.getBoundingClientRect();
    const thirdRect = thirdItem.getBoundingClientRect();
    const to = Math.round(thirdRect.bottom - listRect.top);

    list.classList.add('has-fade');
    swapButtonText(getButtonText(3));

    const contactEl = document.getElementById('contact');

    if (reduced) {
      visibleCount = 3;
      updateVisibility();
      (contactEl || btn).scrollIntoView({ behavior: 'auto' });
      return;
    }

    document.documentElement.style.overflowAnchor = 'none';

    const startScrollY = window.scrollY;
    const deltaH = from - to;

    const contactRect = contactEl ? contactEl.getBoundingClientRect() : null;
    const targetScrollY = contactRect
      ? Math.max(0, startScrollY + contactRect.top - deltaH - 40)
      : startScrollY;

    const duration = 500;
    const startTime = performance.now();
    list.style.overflow = 'hidden';

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);

      const currentH = from + (to - from) * ease;
      list.style.height = currentH + 'px';

      if (Math.abs(targetScrollY - startScrollY) > 2) {
        window.scrollTo(0, startScrollY + (targetScrollY - startScrollY) * ease);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        visibleCount = 3;
        updateVisibility();
        list.style.height = list.style.overflow = '';
        document.documentElement.style.overflowAnchor = '';
      }
    }

    requestAnimationFrame(animate);
  }

  btn.addEventListener('click', () => {
    if (visibleCount >= items.length) {
      collapseToRecent();
    } else {
      expandNext();
    }
  });
}

/* Past/Present deck rotation — public only (admin sees both panes
   stacked for editing). Auto-flips every 10s (2x slower), click switches manually,
   hovering the deck or text freezes auto-rotation cross-browser (including Safari). */
function initDeckToggle() {
  const swap = document.querySelector('.deck-swap');
  if (!swap) return;
  const tabs = [...document.querySelectorAll('.deck-toggle [data-deck-tab]')];
  const panes = [...swap.querySelectorAll('[data-deck-pane]')];
  const block = swap.closest('.masthead-deck-block') || swap;
  let active = 'past';
  let timer = null;
  let isHovered = false;

  function show(id) {
    if (id === active) return;
    active = id;
    tabs.forEach(t => t.classList.toggle('is-active', t.dataset.deckTab === id));
    panes.forEach(p => p.classList.toggle('is-active', p.dataset.deckPane === id));
  }

  function isUserHovering() {
    if (isHovered) return true;
    try {
      return Boolean(block && block.matches && block.matches(':hover'));
    } catch (_) {
      return false;
    }
  }

  const flip = () => {
    if (isUserHovering()) return;
    show(active === 'past' ? 'present' : 'past');
  };

  const start = () => {
    if (!timer) timer = setInterval(flip, 10000);
  };
  const pause = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const onEnter = () => {
    isHovered = true;
    pause();
  };
  const onLeave = () => {
    isHovered = false;
    pause();
    start();
  };

  tabs.forEach(t => t.addEventListener('click', () => {
    pause();
    show(t.dataset.deckTab);
    if (!isUserHovering()) start();
  }));

  if (block) {
    block.addEventListener('mouseenter', onEnter);
    block.addEventListener('mouseleave', onLeave);
    block.addEventListener('pointerenter', onEnter);
    block.addEventListener('pointerleave', onLeave);
  }

  start();
}

/* Floating Toast notification — admin toolbar style next to submit button */
export function showToast(message, duration = 5000, container = null) {
  document.querySelectorAll('.site-toast').forEach(t => t.remove());

  const targetContainer = container || document.querySelector('.form-submit-row') || document.body;

  const toast = document.createElement('div');
  toast.className = 'site-toast';

  const dot = document.createElement('span');
  dot.className = 'site-toast-dot';

  const text = document.createElement('span');
  text.textContent = message;

  toast.appendChild(dot);
  toast.appendChild(text);
  targetContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('is-hiding');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

/* Contact Form handling — no browser alert popup, custom inline field validation */
function initContactForm() {
  const form = document.getElementById('contact-form') || document.querySelector('.form-stack');
  if (!form) return;

  function clearErrors() {
    form.querySelectorAll('.form-input').forEach(input => input.classList.remove('is-invalid'));
    form.querySelectorAll('.form-error-msg').forEach(msg => msg.remove());
  }

  function showError(input, message) {
    if (!input) return;
    input.classList.add('is-invalid');
    const parent = input.closest('.form-field') || input.parentElement;
    if (parent && !parent.querySelector('.form-error-msg')) {
      const err = document.createElement('span');
      err.className = 'form-error-msg';
      err.textContent = message;
      parent.appendChild(err);
    }
  }

  // Clear error state live on user input
  form.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('input', () => {
      input.classList.remove('is-invalid');
      const parent = input.closest('.form-field') || input.parentElement;
      parent?.querySelector('.form-error-msg')?.remove();
    });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    clearErrors();

    const btn = form.querySelector('button[type="submit"]');
    const nameInput = form.querySelector('#name');
    const emailInput = form.querySelector('#email');
    const msgInput = form.querySelector('#message');

    const name = nameInput?.value.trim() || '';
    const email = emailInput?.value.trim() || '';
    const message = msgInput?.value.trim() || '';

    let hasError = false;
    let firstInvalidInput = null;

    if (!name) {
      showError(nameInput, 'Please fill in your name.');
      hasError = true;
      if (!firstInvalidInput) firstInvalidInput = nameInput;
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email) {
      showError(emailInput, 'Please fill in your email address.');
      hasError = true;
      if (!firstInvalidInput) firstInvalidInput = emailInput;
    } else if (!emailRegex.test(email)) {
      showError(emailInput, 'Please enter a valid email address.');
      hasError = true;
      if (!firstInvalidInput) firstInvalidInput = emailInput;
    }

    if (!message) {
      showError(msgInput, 'Please enter project details.');
      hasError = true;
      if (!firstInvalidInput) firstInvalidInput = msgInput;
    }

    if (hasError) {
      firstInvalidInput?.focus();
      return;
    }

    const originalText = btn ? btn.textContent : 'Send Message';
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Sending...';
    }

    const endpoint = form.dataset.formspreeUrl;
    if (endpoint) {
      try {
        const formData = new FormData(form);
        const res = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          if (btn) btn.textContent = originalText;
          form.reset();
          showToast("Message sent! Thank you, I'll get back to you soon.", 5000);
        } else {
          showError(btn?.parentElement, 'Failed to send message. Please try again.');
          if (btn) btn.textContent = originalText;
        }
      } catch (err) {
        showError(btn?.parentElement, 'Connection error. Please try again.');
        if (btn) btn.textContent = originalText;
      } finally {
        if (btn) btn.disabled = false;
      }
    } else {
      const subject = encodeURIComponent(`Contact Form Submission from ${name}`);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
      window.location.href = `mailto:muramets007@gmail.com?subject=${subject}&body=${body}`;
      if (btn) {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    }
  });
}

