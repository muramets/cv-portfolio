import test from 'node:test';
import assert from 'node:assert/strict';

import { CONTENT_VERSION, migrateContent, migrateTextMap } from '../js/content-model.js';

test('migrates the former combined About deck without mutating source data', () => {
  const legacy = {
    'about.deck': 'Intro&nbsp;<div>Past copy</div><div>Present copy</div>',
  };

  const migrated = migrateTextMap(legacy);

  assert.deepEqual(migrated, {
    'about.deck.intro': 'Intro',
    'about.deck.past': 'Past copy',
    'about.deck.present': 'Present copy',
  });
  assert.deepEqual(legacy, {
    'about.deck': 'Intro&nbsp;<div>Past copy</div><div>Present copy</div>',
  });
});

test('preserves a plain legacy deck as the Past pane', () => {
  assert.deepEqual(migrateTextMap({ 'about.deck': 'Existing copy' }), {
    'about.deck.past': 'Existing copy',
  });
});

test('migrates every persona and page to the current document version', () => {
  const legacy = {
    version: 1,
    texts: {
      music: { '/index.html': { 'about.deck': '<div>Past</div><div>Present</div>' } },
      product: { '/index.html': { 'about.deck': 'Product copy' } },
    },
  };

  const migrated = migrateContent(legacy);

  assert.equal(migrated.version, CONTENT_VERSION);
  assert.deepEqual(migrated.texts.music['/index.html'], {
    'about.deck.past': 'Past',
    'about.deck.present': 'Present',
  });
  assert.deepEqual(migrated.texts.product['/index.html'], {
    'about.deck.past': 'Product copy',
  });
  assert.equal(legacy.version, 1);
});
