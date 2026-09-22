import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

test('Keyboard Navigation & Focus Trap Verification (WCAG 2.1.1 & 2.1.2)', async (t) => {
  const headerTsPath = path.join(rootDir, 'client/src/components/Header.ts');
  const headerTs = fs.readFileSync(headerTsPath, 'utf-8');

  await t.test('Header navigation exposes aria-expanded toggle state', () => {
    assert.match(
      headerTs,
      /aria-expanded="false"/i,
      'Mobile menu toggle button must default to aria-expanded="false"'
    );
    assert.match(
      headerTs,
      /aria-controls="primary-navigation"/i,
      'Menu toggle button must specify aria-controls="primary-navigation"'
    );
  });

  await t.test('Escape key listener is bound to dismiss active overlays and trap', () => {
    assert.match(
      headerTs,
      /e\.key\s*===\s*'Escape'/i,
      'Header component must listen for Escape key to close navigation drawer'
    );
    assert.match(
      headerTs,
      /this\.menuToggle\.focus\(\)/i,
      'Focus must be restored to trigger button upon menu dismissal'
    );
  });

  await t.test('Focus shifts forward into first interactive drawer link on open', () => {
    assert.match(
      headerTs,
      /firstLink\?\.focus\(\)/i,
      'Focus must programmatically shift to first link when drawer is opened'
    );
  });
});
