import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

test('Responsive Design Tokens & Mobile-First CSS Architecture Gate', async (t) => {
  const tokensCssPath = path.join(rootDir, 'client/src/styles/tokens.css');
  const styleCssPath = path.join(rootDir, 'client/src/styles/style.css');
  const headerTsPath = path.join(rootDir, 'client/src/components/Header.ts');

  const tokensCss = fs.readFileSync(tokensCssPath, 'utf-8');
  const styleCss = fs.readFileSync(styleCssPath, 'utf-8');
  const headerTs = fs.readFileSync(headerTsPath, 'utf-8');

  await t.test('1. Comprehensive Design Token Palette in :root', () => {
    // Primary brand colors
    assert.match(tokensCss, /--color-primary-800:\s*#002d62/i, 'Must define core brand blue #002d62');
    assert.match(tokensCss, /--color-accent-500:\s*#f59e0b/i, 'Must define accent amber');
    // Fluid typography scales using clamp()
    assert.match(tokensCss, /--font-size-base:\s*clamp\(/i, 'Base font-size must use responsive clamp()');
    assert.match(tokensCss, /--font-size-3xl:\s*clamp\(/i, 'Display font-size must use responsive clamp()');
    // Spacing tokens
    assert.match(tokensCss, /--space-1:\s*0\.25rem/i, 'Must define 4px spacing unit');
    assert.match(tokensCss, /--space-4:\s*1rem/i, 'Must define 16px spacing unit');
    assert.match(tokensCss, /--space-16:\s*4rem/i, 'Must define 64px spacing unit');
    // Border radii
    assert.match(tokensCss, /--radius-md:\s*0\.5rem/i, 'Must define standard border-radius');
    assert.match(tokensCss, /--radius-full:\s*9999px/i, 'Must define pill radius');
    // Shadows & Elevation
    assert.match(tokensCss, /--shadow-md:/i, 'Must define soft medium elevation shadow');
    assert.match(tokensCss, /--shadow-focus:/i, 'Must define high-contrast focus shadow ring');
    // Glassmorphism tokens
    assert.match(tokensCss, /--glass-bg:/i, 'Must define glassmorphism surface background');
    assert.match(tokensCss, /--glass-blur:\s*blur\(/i, 'Must define backdrop-filter blur token');
  });

  await t.test('2. Dark/Light Theme Custom Properties Specification', () => {
    assert.match(tokensCss, /\[data-theme="dark"\]/i, 'Must specify manual dark theme overrides via [data-theme="dark"]');
    assert.match(tokensCss, /@media\s*\(prefers-color-scheme:\s*dark\)/i, 'Must support OS prefers-color-scheme: dark');
    assert.match(tokensCss, /--color-bg-base:\s*#0b0f19/i, 'Dark theme base background must be dark slate');
    assert.match(tokensCss, /--color-text-main:\s*#f8fafc/i, 'Dark theme text must be high-contrast light');
  });

  await t.test('3. Mobile-First Responsive Breakpoints & Multi-Column Grid', () => {
    // Zero horizontal scrollbar guarantees
    assert.match(styleCss, /overflow-x:\s*hidden/i, 'html/body must guarantee zero horizontal overflow');
    assert.match(styleCss, /max-width:\s*100vw/i, 'Viewport width must be contained at 100vw max');
    // Fluid responsive breakpoints
    assert.match(styleCss, /@media\s*\(min-width:\s*768px\)/i, 'Must implement 768px tablet breakpoint');
    assert.match(styleCss, /@media\s*\(min-width:\s*1024px\)/i, 'Must implement 1024px desktop breakpoint');
    assert.match(styleCss, /@media\s*\(min-width:\s*1440px\)/i, 'Must implement 1440px wide display breakpoint');
  });

  await t.test('4. Modern Visual Styling: Glassmorphism, Layered Shadows & Transitions', () => {
    assert.match(styleCss, /backdrop-filter:\s*var\(--glass-blur\)/i, 'Cards or header must implement backdrop-filter blur');
    assert.match(styleCss, /-webkit-backdrop-filter:\s*var\(--glass-blur\)/i, 'Must include WebKit prefix for Safari glassmorphism');
    assert.match(styleCss, /transition:\s*[^;]*var\(--transition-normal\)/i, 'Surfaces must transition colors smoothly');
  });

  await t.test('5. Accessible Theme Toggle Switcher', () => {
    assert.match(headerTs, /id="btn-theme-switch"/i, 'Header must include theme switcher button');
    assert.match(headerTs, /aria-label="Toggle between light and dark color themes"/i, 'Theme button must declare descriptive aria-label');
    assert.match(headerTs, /localStorage\.setItem\('civic-theme'/i, 'Theme preference must persist in localStorage');
  });
});
