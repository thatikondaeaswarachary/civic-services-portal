import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

test('Production Capstone Features & Live Deployment Gate', async (t) => {
  const authTsPath = path.join(rootDir, 'client/src/auth.ts');
  const authModalTsPath = path.join(rootDir, 'client/src/components/AuthModal.ts');
  const ticketDetailModalTsPath = path.join(rootDir, 'client/src/components/TicketDetailModal.ts');
  const catalogViewTsPath = path.join(rootDir, 'client/src/components/CatalogView.ts');
  const mainTsPath = path.join(rootDir, 'client/src/main.ts');
  const distHtmlPath = path.join(rootDir, 'client/dist/index.html');
  const deployYmlPath = path.join(rootDir, '.github/workflows/deploy.yml');

  const authTs = fs.readFileSync(authTsPath, 'utf-8');
  const authModalTs = fs.readFileSync(authModalTsPath, 'utf-8');
  const ticketDetailModalTs = fs.readFileSync(ticketDetailModalTsPath, 'utf-8');
  const catalogViewTs = fs.readFileSync(catalogViewTsPath, 'utf-8');
  const mainTs = fs.readFileSync(mainTsPath, 'utf-8');
  const deployYml = fs.readFileSync(deployYmlPath, 'utf-8');

  await t.test('1. Role-Based Authentication Simulation Architecture', () => {
    // Roles & Personas
    assert.match(authTs, /type\s+UserRole\s*=\s*'RESIDENT'\s*\|\s*'DISPATCHER'/i, 'Must define RESIDENT and DISPATCHER roles');
    assert.match(authTs, /Elena Rostova/i, 'Must provide Elena Rostova Resident persona');
    assert.match(authTs, /Marcus Vance/i, 'Must provide Marcus Vance Dispatcher persona');
    
    // AuthManager Singleton & Persistence
    assert.match(authTs, /class\s+AuthManager/i, 'Must provide AuthManager class');
    assert.match(authTs, /civic_auth_session/i, 'Must persist session in localStorage');
    assert.match(authTs, /onAuthStateChanged/i, 'Must support reactive auth state subscriptions');
    assert.match(authTs, /isDispatcher\(\)/i, 'Must provide role-guard checks');

    // AuthModal Dialog & A11y
    assert.match(authModalTs, /document\.createElement\('dialog'\)|<dialog/i, 'AuthModal must use semantic <dialog>');
    assert.match(authModalTs, /aria-labelledby.*auth-dialog-title/i, 'AuthModal must declare accessible title');
    assert.match(authModalTs, /trapFocus/i, 'AuthModal must implement focus trap for keyboard navigation');
    assert.match(authModalTs, /Escape/i, 'AuthModal must handle Escape key dismissal');
  });

  await t.test('2. Interactive Civic Service Catalog', () => {
    assert.match(catalogViewTs, /class\s+CatalogView/i, 'Must implement CatalogView component');
    assert.match(catalogViewTs, /btn-category-tab/i, 'Must provide category filter tabs');
    assert.match(catalogViewTs, /STREETS/i, 'Must support Streets & Sidewalks filter');
    assert.match(catalogViewTs, /HOUSING/i, 'Must support Housing filter');
    assert.match(catalogViewTs, /SANITATION/i, 'Must support Sanitation filter');
    assert.match(catalogViewTs, /PARKS/i, 'Must support Parks filter');
    assert.match(catalogViewTs, /Request This Service/i, 'Must provide one-click service filing trigger');
  });

  await t.test('3. Dynamic CRUD Operations Engine', () => {
    // Create (C)
    assert.match(mainTs, /this\.incidentRows\.unshift\(/i, 'Must prepend newly submitted tickets to ledger');
    assert.match(mainTs, /NYC-2026-/i, 'Must generate tracking IDs following standard format');

    // Read (R)
    assert.match(mainTs, /this\.loadPersistedLedger\(\)/i, 'Must load and deserialize ledger state on initialization');
    assert.match(mainTs, /this\.dataTable\.updateData\(/i, 'Must dynamically refresh data table without page reload');

    // Update (U)
    assert.match(mainTs, /handleTicketUpdate/i, 'Must support status and priority updates on existing tickets');
    assert.match(ticketDetailModalTs, /SUBMITTED.*DISPATCHED.*IN_PROGRESS.*RESOLVED/s, 'Must support lifecycle status transitions');
    assert.match(ticketDetailModalTs, /activity-timeline/i, 'Must maintain audit trail and progress notes');

    // Delete (D)
    assert.match(mainTs, /handleTicketDelete/i, 'Must implement ticket deletion/withdrawal');
    assert.match(ticketDetailModalTs, /btn-delete-ticket/i, 'Must provide accessible delete/withdraw action');
  });

  await t.test('4. Persistent Client State Synchronization', () => {
    assert.match(mainTs, /civic_tickets_ledger_v2/i, 'Must use dedicated localStorage key for ledger persistence');
    assert.match(mainTs, /localStorage\.setItem\(/i, 'Must persist mutations to localStorage');
    assert.match(mainTs, /localStorage\.getItem\(/i, 'Must recover state across browser refreshes');
  });

  await t.test('5. Production Cloud Deployment Pipeline Configuration', () => {
    // GitHub Pages Workflow
    assert.match(deployYml, /actions\/deploy-pages/i, 'Must use official GitHub Pages deployment action');
    assert.match(deployYml, /upload-pages-artifact/i, 'Must package client dist artifact');
    assert.match(deployYml, /npm test/i, 'Must execute quality gate tests prior to deployment');

    // Vercel & Netlify
    assert.ok(fs.existsSync(path.join(rootDir, 'vercel.json')), 'vercel.json must exist at repository root');
    assert.ok(fs.existsSync(path.join(rootDir, 'netlify.toml')), 'netlify.toml must exist at repository root');
  });

  await t.test('6. Static Build Artifacts Integrity', () => {
    assert.ok(fs.existsSync(distHtmlPath), 'client/dist/index.html must exist after build');
    const distHtml = fs.readFileSync(distHtmlPath, 'utf-8');
    assert.match(distHtml, /<script[^>]*type="module"/i, 'Distribution HTML must load compiled JavaScript module bundle');
    assert.match(distHtml, /<link[^>]*rel="stylesheet"/i, 'Distribution HTML must load compiled CSS assets');

    const distAssetsDir = path.join(rootDir, 'client/dist/assets');
    assert.ok(fs.existsSync(distAssetsDir), 'client/dist/assets must exist');
    const assets = fs.readdirSync(distAssetsDir);
    const hasJs = assets.some(f => f.endsWith('.js'));
    const hasCss = assets.some(f => f.endsWith('.css'));
    assert.ok(hasJs, 'Production assets must contain compiled JavaScript bundle');
    assert.ok(hasCss, 'Production assets must contain compiled CSS bundle');
  });
});
