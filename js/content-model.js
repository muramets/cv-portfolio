// Versioned, DOM-independent content migrations. Keeping this logic pure makes
// old published JSON and old local drafts behave identically and testably.

export const CONTENT_VERSION = 2;

function clone(value) {
  return structuredClone(value ?? {});
}

function cleanLegacyLead(value) {
  return value.replace(/(?:\s|&nbsp;)+$/gi, '').trim();
}

/**
 * Split the former single About deck into its three editable panes. Older
 * values used two <div> blocks for Past and Present; a plain legacy value is
 * preserved as Past instead of being discarded.
 */
export function migrateTextMap(texts) {
  const next = clone(texts);
  const legacy = next['about.deck'];
  if (legacy === undefined) return next;

  const source = String(legacy);
  const parts = [...source.matchAll(/<div\b[^>]*>([\s\S]*?)<\/div>/gi)];
  if (parts.length >= 2) {
    const lead = cleanLegacyLead(source.slice(0, parts[0].index));
    if (lead && next['about.deck.intro'] === undefined) next['about.deck.intro'] = lead;
    if (next['about.deck.past'] === undefined) next['about.deck.past'] = parts[0][1];
    if (next['about.deck.present'] === undefined) next['about.deck.present'] = parts[1][1];
  } else if (next['about.deck.past'] === undefined) {
    next['about.deck.past'] = source;
  }

  delete next['about.deck'];
  return next;
}

/** Return a v2 content document without mutating the supplied value. */
export function migrateContent(content) {
  const next = clone(content);
  next.texts = next.texts && typeof next.texts === 'object' ? next.texts : {};

  Object.entries(next.texts).forEach(([variantId, pages]) => {
    if (!pages || typeof pages !== 'object') return;
    next.texts[variantId] = Object.fromEntries(
      Object.entries(pages).map(([page, texts]) => [page, migrateTextMap(texts)]),
    );
  });

  next.version = CONTENT_VERSION;
  return next;
}
