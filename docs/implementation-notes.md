# Implementation Notes: Civic Services Portal Architecture & Accessibility

## 1. Project Background & Reverse-Engineering Scope

- **Target System**: New York City 311 Citizen Services Portal (`https://portal.311.nyc.gov/`).
- **Objective**: Reverse-engineer the high-volume public service platform into a modern, accessible, and maintainable full-stack monorepo foundation.
- **Repository URL**: [https://github.com/thatikondaeaswarachary/civic-services-portal](https://github.com/thatikondaeaswarachary/civic-services-portal)
- **Compliance Baseline**: **W3C WCAG 2.1 & 2.2 Conformance Level AA**, Section 508, and Title II of the Americans with Disabilities Act (ADA).

---

## 2. Technical Architecture & Monorepo Boundaries

The repository is structured using native **npm workspaces** with three decoupled packages:

### A. Client Application (`client/`)
- **Technology**: Vite 5, TypeScript, Semantic HTML5, Vanilla CSS Design System.
- **Accessibility Invariants**:
  - **Skip Link**: `<a href="#main-content" class="skip-link">Skip to main content</a>` enables motor-impaired and keyboard users to bypass redundant header items.
  - **Semantic Landmarks**: Uses standard HTML5 landmarks (`<header role="banner">`, `<nav aria-label="...">`, `<main id="main-content" tabindex="-1">`, `<footer role="contentinfo">`) to provide a structured screen reader hierarchy.
  - **Focus Appearance (WCAG 2.4.7 & 2.4.13)**: Employs a dual-ring `:focus-visible` styling (`outline: 3px solid #2563eb; outline-offset: 2px; box-shadow: 0 0 0 5px rgba(37, 99, 235, 0.35)`) achieving a minimum 3:1 contrast ratio against both light and dark backgrounds.
  - **Assistive Announcements**: A dedicated off-screen live region (`#global-announcer` with `aria-live="polite"` and `aria-atomic="true"`) announces form validations, submissions, and status updates to screen readers.
  - **Focus Management**: The mobile navigation drawer traps the `Tab` key cycle, updates `aria-expanded`, listens for `Escape` to close, and restores focus to the trigger button upon dismissal.

### B. Server Application (`server/`)
- **Technology**: Node.js 24, TypeScript, Native HTTP module, RFC 7807 Error Handler.
- **API Design & Contracts**:
  - `GET /api/v1/health`: Liveness probe for orchestration and monitoring.
  - `GET /api/v1/services`: Returns available municipal services with standard SLAs and dispatching agencies.
  - `POST /api/v1/requests`: Validates incoming ticket data. On success, assigns a persistent tracking number (e.g. `NYC-2026-4822`) and records an initial audit event.
  - `GET /api/v1/requests/:trackingId`: Retrieves complete ticket lifecycle history.
- **Error Standard (RFC 7807)**:
  - All errors respond with `Content-Type: application/problem+json`.
  - Structured fields include `type`, `title`, `status`, `detail`, `instance`, and an array of `invalidParams` (e.g. `{ name: "address", reason: "Incident address must be at least 5 characters long." }`).
- **Security Headers**:
  - Enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and restrictive CORS headers.

### C. Automated Conformance Gate (`tests/`)
- **Automated Tests**:
  - `tests/src/a11y.test.mjs`: Validates skip link anchors, landmark targets, explicit `<label>` bindings, non-empty accessible button names, and focus ring definitions.
  - `tests/src/keyboard.test.mjs`: Validates keyboard event handling (`Escape` dismissal, focus shift, and `aria-expanded` toggle).
  - `tests/src/api.test.mjs`: Full end-to-end HTTP integration suite verifying health, catalog listings, RFC 7807 validation failures, ticket generation, and status lookups.

---

## 3. WCAG Issue Remediations Summary

| Issue ID | Component | WCAG Standard | Legacy Defect | Remediation Implemented |
| :--- | :--- | :--- | :--- | :--- |
| **WEB-001** | Skip Navigation | 2.4.1 (Level A) | Link targeted `#main`, which was absent from the DOM. | Linked to `<main id="main-content" tabindex="-1">` with visible `:focus-visible` banner. |
| **WEB-002** | Search Input | 3.3.2 (Level A) | Relied on placeholder text; missing `<label>` or `aria-label`. | Added explicit `<label for="service-search-input">` with permanent helper text. |
| **WEB-003** | Submit Button | 4.1.2 (Level A) | `<input type="submit" value="">` with zero accessible name. | Replaced with semantic `<button type="submit" aria-label="...">` containing visible text. |
| **WEB-004** | Header Focus | 2.4.7 (Level AA) | `button:focus { outline: none !important; }` suppressed focus rings. | Implemented 3px dual-ring focus indicator with >= 3:1 contrast ratio. |
| **WEB-005** | Mobile Drawer | 2.1.2 (Level A) | Overlay did not constrain Tab key; Escape key failed to dismiss. | Implemented modal focus trap, Escape key listener, and `aria-expanded` synchronization. |

---

## 4. The Vertical Feature Slice: Citizen Service Request & Tracking

1. **Intake Flow**:
   - The citizen presses `Tab` on initial page load, focuses the skip link, and activates `Enter` to jump straight to the `<main>` container.
   - The user selects a municipal issue category (e.g., Street Pothole Repair).
   - Form inputs validate in real time: invalid fields receive `aria-invalid="true"` and associate with inline error messages via `aria-describedby`.
2. **Submission & Dispatch**:
   - The form submits a JSON payload to `POST /api/v1/requests`.
   - The server validates required parameters and returns HTTP 201 Created with a tracking ID (`NYC-2026-XXXX`).
   - Client updates the `#global-announcer` live region to notify assistive technology.
3. **Status Lookup & Timeline**:
   - Entering the tracking code in the Status Tracker triggers `GET /api/v1/requests/:trackingId`.
   - Renders a step-by-step audit trail: `SUBMITTED` -> `RECEIVED` -> `DISPATCHED` -> `IN_PROGRESS` -> `RESOLVED`.

---

## 5. Developer Guide & Script Reference

### Running on Windows PowerShell
Due to PowerShell execution policies on Windows, execute scripts using `npm.cmd`:

```powershell
# 1. Run all automated tests (A11y, Keyboard, and API)
npm.cmd test

# 2. Start the backend REST API (Port 3001)
npm.cmd run dev:server

# 3. Start the frontend Vite development server (Port 3000)
npm.cmd run dev:client

# 4. Build both server and client for production
npm.cmd run build
```

### Endpoints
- **Frontend UI**: `http://localhost:3000`
- **API Health**: `http://localhost:3001/api/v1/health`
- **API Service Catalog**: `http://localhost:3001/api/v1/services`
- **API Request Tracking**: `http://localhost:3001/api/v1/requests/NYC-2026-1001`
