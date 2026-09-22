import test from 'node:test';
import assert from 'node:assert/strict';
import { createCivicServer } from '../../server/dist/server.js';

test('REST API Vertical Slice & RFC 7807 Conformance Tests', async (t) => {
  const server = createCivicServer();

  await new Promise((resolve) => {
    server.listen(0, () => resolve());
  });

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 3001;
  const baseUrl = `http://localhost:${port}`;

  t.after(() => {
    server.close();
  });

  await t.test('GET /api/v1/health returns HTTP 200 and operational status', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'UP');
    assert.equal(body.service, 'civic-services-api');
  });

  await t.test('GET /api/v1/services lists municipal services with SLAs', async () => {
    const res = await fetch(`${baseUrl}/api/v1/services`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.services));
    assert.ok(body.services.length >= 5);
    const potholeService = body.services.find((s) => s.id === 'srv-pothole');
    assert.ok(potholeService, 'Pothole repair service must exist in catalog');
    assert.equal(potholeService.agency, 'Department of Transportation (DOT)');
  });

  await t.test('POST /api/v1/requests rejects incomplete payloads with RFC 7807 Problem Details', async () => {
    const res = await fetch(`${baseUrl}/api/v1/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId: 'srv-pothole' }) // Missing address, borough, description
    });

    assert.equal(res.status, 422);
    assert.equal(res.headers.get('content-type')?.includes('application/problem+json'), true);
    const problem = await res.json();
    assert.equal(problem.title, 'Validation Failure');
    assert.ok(Array.isArray(problem.invalidParams));
    assert.ok(problem.invalidParams.some((p) => p.name === 'address'));
    assert.ok(problem.invalidParams.some((p) => p.name === 'borough'));
    assert.ok(problem.invalidParams.some((p) => p.name === 'description'));
  });

  let createdTrackingId = '';

  await t.test('POST /api/v1/requests successfully creates a new ticket and returns tracking ID', async () => {
    const payload = {
      serviceId: 'srv-pothole',
      address: '789 5th Avenue, New York, NY 10022',
      borough: 'Manhattan',
      description: 'Dangerous pothole near crosswalk causing pedestrian trip hazards.',
      contactEmail: 'citizen.test@example.com'
    };

    const res = await fetch(`${baseUrl}/api/v1/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.match(body.trackingId, /^NYC-2026-\d+$/);
    assert.equal(body.request.status, 'SUBMITTED');
    assert.equal(body.request.borough, 'Manhattan');
    createdTrackingId = body.trackingId;
  });

  await t.test('GET /api/v1/requests/:trackingId retrieves created ticket and audit trail', async () => {
    assert.ok(createdTrackingId, 'Tracking ID must have been created in prior step');
    const res = await fetch(`${baseUrl}/api/v1/requests/${createdTrackingId}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.request.trackingId, createdTrackingId);
    assert.ok(Array.isArray(body.request.timeline));
    assert.equal(body.request.timeline[0].status, 'SUBMITTED');
  });

  await t.test('GET /api/v1/requests/:trackingId returns 404 RFC 7807 for unknown ticket', async () => {
    const res = await fetch(`${baseUrl}/api/v1/requests/NYC-NONEXISTENT-9999`);
    assert.equal(res.status, 404);
    assert.equal(res.headers.get('content-type')?.includes('application/problem+json'), true);
    const problem = await res.json();
    assert.equal(problem.title, 'Ticket Not Found');
  });
});
