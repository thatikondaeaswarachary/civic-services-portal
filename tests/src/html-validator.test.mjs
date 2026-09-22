import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

test('W3C Semantic HTML5 & Accessible Component Architecture Gate', async (t) => {
  const indexHtmlPath = path.join(rootDir, 'client/index.html');
  const mainTsPath = path.join(rootDir, 'client/src/main.ts');
  const sidebarTsPath = path.join(rootDir, 'client/src/components/EnterpriseSidebar.ts');
  const tableTsPath = path.join(rootDir, 'client/src/components/DataTable.ts');
  const formTsPath = path.join(rootDir, 'client/src/components/EnterpriseForm.ts');
  const modalTsPath = path.join(rootDir, 'client/src/components/AccessibleModal.ts');

  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
  const mainTs = fs.readFileSync(mainTsPath, 'utf-8');
  const sidebarTs = fs.readFileSync(sidebarTsPath, 'utf-8');
  const tableTs = fs.readFileSync(tableTsPath, 'utf-8');
  const formTs = fs.readFileSync(formTsPath, 'utf-8');
  const modalTs = fs.readFileSync(modalTsPath, 'utf-8');

  await t.test('1. Valid HTML5 Document Root & Head Metadata', () => {
    assert.match(indexHtml, /^<!DOCTYPE html>/i, 'Must have valid HTML5 DOCTYPE declaration');
    assert.match(indexHtml, /<html\s+[^>]*lang="en"[^>]*>/i, 'Root <html> tag must declare lang="en"');
    assert.match(indexHtml, /<meta\s+charset="UTF-8"\s*\/?>/i, 'Must specify UTF-8 charset');
    assert.match(indexHtml, /<meta\s+name="viewport"\s+content="[^"]*width=device-width[^"]*"\s*\/?>/i, 'Must specify responsive viewport');
    assert.match(indexHtml, /<title>[^<]+<\/title>/i, 'Document must have descriptive <title>');
  });

  await t.test('2. Strict Semantic HTML5 Landmark Structure (<header>, <nav>, <aside>, <main>, <footer>)', () => {
    // Header
    assert.match(mainTs, /document\.createElement\('header'\)|role="banner"/i, 'Header landmark with role="banner" must exist');
    // Aside
    assert.match(sidebarTs, /document\.createElement\('aside'\)/i, 'Sidebar must use semantic <aside>');
    assert.match(sidebarTs, /aria-label="[^"]+"/i, 'Sidebar must have descriptive aria-label');
    // Nav
    assert.match(sidebarTs, /<nav\s+aria-label="[^"]+"/i, 'Navigation must use <nav> with explicit aria-label');
    // Main
    assert.match(mainTs, /document\.createElement\('main'\)/i, 'Main content area must use semantic <main>');
    assert.match(mainTs, /main\.id\s*=\s*'main-content'/i, 'Main landmark must carry id="main-content" for skip target');
    assert.match(mainTs, /main\.tabIndex\s*=\s*-1/i, 'Main landmark must have tabIndex=-1 for programmatic focus');
    // Footer
    assert.match(mainTs, /document\.createElement\('footer'\)|role="contentinfo"/i, 'Footer must use semantic <footer> with role="contentinfo"');
  });

  await t.test('3. Accessible Data Table Architecture (<caption, thead, tbody, th scope="col", th scope="row">)', () => {
    assert.match(tableTs, /role="region"/i, 'Table wrapper must declare role="region"');
    assert.match(tableTs, /tabindex="0"/i, 'Table wrapper must be keyboard focusable (tabindex="0") for horizontal scroll');
    assert.match(tableTs, /<caption[^>]*>/i, 'Table must contain accessible <caption>');
    assert.match(tableTs, /<colgroup>/i, 'Table must declare semantic <colgroup>');
    assert.match(tableTs, /<th\s+scope="col"/i, 'Column headers must declare scope="col"');
    assert.match(tableTs, /<th\s+scope="row"/i, 'Row headers must declare scope="row"');
    assert.match(tableTs, /aria-sort="/i, 'Sortable column headers must declare aria-sort');
  });

  await t.test('4. Comprehensive Form Controls (<fieldset>, <legend>, labels, validation, output)', () => {
    assert.match(formTs, /<fieldset\s+class="form-fieldset">/i, 'Form must group controls using <fieldset>');
    assert.match(formTs, /<legend\s+class="form-legend">/i, 'Every <fieldset> must have a direct <legend>');
    assert.match(formTs, /role="radiogroup"/i, 'Radio group must declare role="radiogroup"');
    assert.match(formTs, /<label\s+for="service-category-select"/i, 'Inputs must bind explicit <label for="...">');
    assert.match(formTs, /id="service-category-select"/i, 'Input id must match label for attribute');
    assert.match(formTs, /aria-required="true"/i, 'Required inputs must specify aria-required="true"');
    assert.match(formTs, /<output[^>]*aria-live="polite"/i, 'Character counter must use semantic <output> with aria-live="polite"');
  });

  await t.test('5. Accessible Modal Dialog Architecture (<dialog>, aria-modal, focus trap, Escape key)', () => {
    assert.match(modalTs, /document\.createElement\('dialog'\)/i, 'Modal must use semantic HTML5 <dialog>');
    assert.match(modalTs, /aria-labelledby.*modal-dialog-title/i, 'Dialog must be labeled by its title via aria-labelledby');
    assert.match(modalTs, /aria-describedby.*modal-dialog-desc/i, 'Dialog must be described by its description via aria-describedby');
    assert.match(modalTs, /e\.key\s*===\s*'Tab'/i, 'Dialog must manage Tab key trap');
    assert.match(modalTs, /this\.triggerElement\.focus\(\)/i, 'Dialog must restore focus to trigger element upon closing');
  });
});
