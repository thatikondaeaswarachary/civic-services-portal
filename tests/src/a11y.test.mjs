import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

test('Accessibility Audit Automated Gate: WCAG 2.2 AA Verification', async (t) => {
  const indexPath = path.join(rootDir, 'client/index.html');
  const tokensCssPath = path.join(rootDir, 'client/src/styles/tokens.css');
  const a11yCssPath = path.join(rootDir, 'client/src/styles/a11y.css');
  const mainTsPath = path.join(rootDir, 'client/src/main.ts');
  const searchBarTsPath = path.join(rootDir, 'client/src/components/SearchBar.ts');
  const serviceFormTsPath = path.join(rootDir, 'client/src/components/ServiceForm.ts');

  const indexHtml = fs.readFileSync(indexPath, 'utf-8');
  const a11yCss = fs.readFileSync(a11yCssPath, 'utf-8');
  const searchBarTs = fs.readFileSync(searchBarTsPath, 'utf-8');
  const serviceFormTs = fs.readFileSync(serviceFormTsPath, 'utf-8');

  await t.test('WEB-001 Remediation: Skip-to-content anchor and matching landmark target exist', () => {
    assert.match(
      indexHtml,
      /<a\s+[^>]*href="#main-content"[^>]*class="skip-link"[^>]*>/i,
      'index.html must include skip link pointing to #main-content'
    );
    assert.match(
      indexHtml,
      /id="global-announcer"\s+class="sr-only"\s+aria-live="polite"/i,
      'index.html must contain an aria-live="polite" region for screen reader updates'
    );
  });

  await t.test('WEB-002 Remediation: Search inputs feature explicit programmatically bound labels', () => {
    assert.match(
      searchBarTs,
      /<label\s+for="service-search-input"/i,
      'SearchBar component must bind explicit <label for="service-search-input">'
    );
    assert.match(
      searchBarTs,
      /id="service-search-input"/i,
      'SearchBar must contain matching input with id="service-search-input"'
    );
  });

  await t.test('WEB-003 Remediation: Action buttons possess non-empty accessible names and text alternatives', () => {
    assert.match(
      searchBarTs,
      /aria-label="Submit search query for civic services"/i,
      'Submit button must declare explicit aria-label'
    );
    assert.match(
      searchBarTs,
      /<span class="btn-text">Search<\/span>/i,
      'Submit button must contain visible text alternative'
    );
  });

  await t.test('WEB-004 Remediation: Visible dual-ring focus indicator defined for :focus-visible', () => {
    assert.match(
      a11yCss,
      /:focus-visible\s*\{[^}]*outline:\s*3px\s+solid/i,
      'a11y.css must define high-contrast 3px outline on :focus-visible'
    );
    assert.match(
      a11yCss,
      /outline-offset:\s*3px/i,
      'Focus indicator must include offset spacing for clear visibility'
    );
  });

  await t.test('WEB-005 Remediation: Form inputs bind aria-describedby and error live regions', () => {
    assert.match(
      serviceFormTs,
      /aria-describedby="category-hint category-error"/i,
      'Category dropdown must be described by hint and error containers'
    );
    assert.match(
      serviceFormTs,
      /aria-describedby="address-hint address-error"/i,
      'Address field must be described by hint and error containers'
    );
    assert.match(
      serviceFormTs,
      /aria-live="polite"/i,
      'Error displays must include aria-live="polite" for dynamic error announcements'
    );
  });
});
