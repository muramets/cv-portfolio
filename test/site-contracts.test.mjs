import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = file => readFile(resolve(root, file), 'utf8');

test('published content uses the current schema without obsolete deck keys', async () => {
  const content = JSON.parse(await read('data/content.json'));
  assert.equal(content.version, 2);
  assert.equal(JSON.stringify(content).includes('"about.deck"'), false);
});

test('all internal modules have one identity, including the admin renderer', async () => {
  const [main, admin, render] = await Promise.all([
    read('js/main.js'),
    read('js/admin.js'),
    read('js/render.js'),
  ]);
  assert.equal(/from ['"][^'"]+\?v=/.test(main + admin + render), false);
  assert.match(main, /await import\('\.\/admin\.js'\)/);
});

test('Impact gate lettering is content-managed and available to the editor', async () => {
  const [about, adminCss] = await Promise.all([read('about.html'), read('css/admin.css')]);
  assert.match(about, /data-text-id="about\.impact\.gate\.left"/);
  assert.match(about, /data-text-id="about\.impact\.gate\.right"/);
  assert.match(adminCss, /\.admin-authed \.scroll-chapter__shutter/);
});

test('floating navigation and admin toolbar retain independent feature boundaries', async () => {
  const [main, navigation, sectionBar, admin, toolbar, publisher] = await Promise.all([
    read('js/main.js'),
    read('js/features/navigation.js'),
    read('js/features/section-bar.js'),
    read('js/admin.js'),
    read('js/admin/toolbar.js'),
    read('js/admin/publisher.js'),
  ]);

  assert.match(main, /from '\.\/features\/section-bar\.js'/);
  assert.doesNotMatch(navigation, /function initSectionBar/);
  assert.match(sectionBar, /export function initSectionBar/);
  assert.match(admin, /from '\.\/admin\/toolbar\.js'/);
  assert.match(admin, /from '\.\/admin\/publisher\.js'/);
  assert.match(toolbar, /export function createAdminToolbar/);
  assert.match(publisher, /export async function publishContent/);
  assert.doesNotMatch(admin, /api\.github\.com/);
});

test('timeline fold lands at compact Journey instead of Contact', async () => {
  const [main, timeline, geometry, sectionBar] = await Promise.all([
    read('js/main.js'),
    read('js/features/journey/index.js'),
    read('js/features/journey/timeline-geometry.js'),
    read('js/features/section-bar.js'),
  ]);

  assert.match(main, /mountJourneyTimeline/);
  assert.match(timeline, /document\.body\.classList\.add\('is-journey-collapsing', 'is-timeline-folding'\)/);
  assert.match(timeline, /window\.dispatchEvent\(new Event\('timelinefoldstart'\)\)/);
  assert.match(timeline, /const FOLD_DURATION_MS = 1500;/);
  assert.match(timeline, /getCollapsePlan/);
  assert.match(geometry, /controlBottomAfterCollapse/);
  assert.match(geometry, /desiredControlBottom/);
  assert.doesNotMatch(timeline + geometry, /scrollToPageEnd|journeyBottom|compactJourneyEnd/);
  assert.match(sectionBar, /is-timeline-folding/);
  assert.match(sectionBar, /timelinefoldend/);
});

test('Journey intro keeps its native sticky context during the component fold', async () => {
  const [about, timeline, layout] = await Promise.all([
    read('about.html'),
    read('js/features/journey/index.js'),
    read('css/layout.css'),
  ]);

  assert.match(layout, /is-journey-collapsing:not\(\.is-admin\) \.section--journey \.journey-layout/);
  assert.match(about, /journey-layout">\s*<div class="journey-layout__intro">/);
  assert.match(layout, /\.journey-layout__intro \{\s+position: sticky;/);
  assert.doesNotMatch(about, /journey-layout__intro-shell/);
  assert.doesNotMatch(timeline + layout, /is-fold-locked|cloneNode\(|position: fixed/);
});

test('the fold walks height and scroll on one clock with no spacer', async () => {
  const [timeline, geometry] = await Promise.all([
    read('js/features/journey/index.js'),
    read('js/features/journey/timeline-geometry.js'),
  ]);

  // Height and scroll share the eased progress; the absolute target is clamped
  // to the post-collapse maxScroll so no frame overshoots into a clamped state.
  assert.match(timeline, /const height = Math\.round\(plan\.expandedHeight - plan\.heightDelta \* eased\)/);
  assert.match(timeline, /const scroll = Math\.round\(startScroll \+ \(plan\.targetScroll - startScroll\) \* eased\)/);
  assert.match(geometry, /finalMaxScroll/);
  // The abandoned spacer scheme must not resurface.
  assert.doesNotMatch(timeline, /foldSpacer/);
});
