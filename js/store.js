// Persistence adapter. MVP: localStorage. The interface (load/save/reset) is
// the contract — a future RemoteStore (REST/DB) implements the same four
// functions and the rest of the app doesn't change.

const PREFIX = 'cv.v1.';

function key(kind, name) {
  return PREFIX + kind + '.' + name;
}

export const store = {
  /* ── Content variants (personas) ─────────────────────────────
     Each variant owns its own copy of every collection, so the CV
     can be tailored per vacancy. The active variant is what
     renders — for visitors as well (admin picks, everyone sees). */

  getVariants() {
    const raw = localStorage.getItem(PREFIX + 'variants');
    try {
      const list = raw ? JSON.parse(raw) : null;
      if (Array.isArray(list) && list.length) return list;
    } catch { /* fall through */ }
    return [{ id: 'default', label: 'Default' }];
  },

  saveVariants(list) {
    localStorage.setItem(PREFIX + 'variants', JSON.stringify(list));
  },

  getActiveVariant() {
    return localStorage.getItem(PREFIX + 'variant.active') || 'default';
  },

  setActiveVariant(id) {
    localStorage.setItem(PREFIX + 'variant.active', id);
  },

  deleteVariantData(id) {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX + 'col.' + id + '.')
                || k.startsWith(PREFIX + 'texts.' + id + '.'))
      .forEach(k => localStorage.removeItem(k));
  },

  /** Clone every stored key of one variant (collections + texts on ALL
      pages) into another — a new persona starts as a full copy of the
      one it was created from, not of the seeds. */
  copyVariantData(fromId, toId) {
    const colFrom = PREFIX + 'col.' + fromId + '.';
    const txtFrom = PREFIX + 'texts.' + fromId + '.';
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(colFrom)) {
        localStorage.setItem(PREFIX + 'col.' + toId + '.' + k.slice(colFrom.length), localStorage.getItem(k));
      } else if (k.startsWith(txtFrom)) {
        localStorage.setItem(PREFIX + 'texts.' + toId + '.' + k.slice(txtFrom.length), localStorage.getItem(k));
      } else if (fromId === 'default') {
        // legacy unscoped keys belong to the default variant
        if (k.startsWith(PREFIX + 'col.') && !k.slice((PREFIX + 'col.').length).includes('.')) {
          const name = k.slice((PREFIX + 'col.').length);
          if (!localStorage.getItem(colFrom + name)) {
            localStorage.setItem(PREFIX + 'col.' + toId + '.' + name, localStorage.getItem(k));
          }
        } else if (k.startsWith(PREFIX + 'texts./')) {
          const page = k.slice((PREFIX + 'texts.').length);
          if (!localStorage.getItem(txtFrom + page)) {
            localStorage.setItem(PREFIX + 'texts.' + toId + '.' + page, localStorage.getItem(k));
          }
        }
      }
    });
  },

  /** @returns {Array|null} saved collection (active variant) or null */
  loadCollection(name) {
    const variant = this.getActiveVariant();
    const raw = localStorage.getItem(key('col', variant + '.' + name))
      // legacy pre-variant key counts as the default variant's data
      ?? (variant === 'default' ? localStorage.getItem(key('col', name)) : null);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  saveCollection(name, items) {
    const variant = this.getActiveVariant();
    localStorage.setItem(key('col', variant + '.' + name), JSON.stringify(items));
  },

  /** Singleton texts are scoped per variant AND per page — the persona
      toggle swaps page copy (hero deck, footers, titles) along with
      collections. @returns {Object} map of textId -> html */
  loadTexts(page) {
    const variant = this.getActiveVariant();
    const raw = localStorage.getItem(key('texts', variant + '.' + page))
      // legacy pre-variant key counts as the default variant's data
      ?? (variant === 'default' ? localStorage.getItem(key('texts', page)) : null);
    if (!raw) return {};
    try { return JSON.parse(raw) || {}; } catch { return {}; }
  },

  saveTexts(page, map) {
    const variant = this.getActiveVariant();
    localStorage.setItem(key('texts', variant + '.' + page), JSON.stringify(map));
  },

  /** @returns {string[]|null} saved block order for a page, or null */
  loadBlockOrder(page) {
    const raw = localStorage.getItem(key('blocks', page));
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  saveBlockOrder(page, ids) {
    localStorage.setItem(key('blocks', page), JSON.stringify(ids));
  },

  /** Drop all local overrides — site falls back to seed content. */
  resetAll() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX) && k !== PREFIX + 'admin')
      .forEach(k => localStorage.removeItem(k));
  },
};
