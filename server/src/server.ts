import http, { IncomingMessage, ServerResponse } from 'node:http';
import { ticketService } from './services/ticketService.js';
import { sendProblemDetails } from './middleware/errorHandler.js';
import { CreateRequestInput } from './models/types.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

function applySecurityHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

function sendJsonResponse(res: ServerResponse, status: number, data: any): void {
  applySecurityHeaders(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

async function parseJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        if (!body) {
          resolve({} as T);
        } else {
          resolve(JSON.parse(body) as T);
        }
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

export function createCivicServer(): http.Server {
  return http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
    applySecurityHeaders(res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    console.log(`[HTTP ${method}] ${pathname}`);

    try {
      // Health Check
      if (method === 'GET' && (pathname === '/api/v1/health' || pathname === '/health')) {
        sendJsonResponse(res, 200, {
          status: 'UP',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          service: 'civic-services-api'
        });
        return;
      }

      // GET /api/v1/services
      if (method === 'GET' && pathname === '/api/v1/services') {
        const services = ticketService.listServices();
        sendJsonResponse(res, 200, {
          count: services.length,
          services
        });
        return;
      }

      // POST /api/v1/requests
      if (method === 'POST' && pathname === '/api/v1/requests') {
        let input: CreateRequestInput;
        try {
          input = await parseJsonBody<CreateRequestInput>(req);
        } catch (err: any) {
          sendProblemDetails(res, 400, 'Invalid Request Body', err.message, pathname);
          return;
        }

        // RFC 7807 Validation
        const invalidParams: Array<{ name: string; reason: string }> = [];
        if (!input.serviceId || typeof input.serviceId !== 'string') {
          invalidParams.push({ name: 'serviceId', reason: 'A valid service category selection is required.' });
        }
        if (!input.address || input.address.trim().length < 5) {
          invalidParams.push({ name: 'address', reason: 'Incident address must be at least 5 characters long.' });
        }
        if (!input.borough || !['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'].includes(input.borough)) {
          invalidParams.push({ name: 'borough', reason: 'A valid NYC borough must be selected.' });
        }
        if (!input.description || input.description.trim().length < 10) {
          invalidParams.push({ name: 'description', reason: 'Please describe the incident with at least 10 characters.' });
        }

        if (invalidParams.length > 0) {
          sendProblemDetails(
            res,
            422,
            'Validation Failure',
            'One or more fields failed validation checks.',
            pathname,
            invalidParams
          );
          return;
        }

        try {
          const result = ticketService.createRequest(input);
          sendJsonResponse(res, 201, {
            success: true,
            trackingId: result.trackingId,
            message: 'Your service request has been logged successfully with NYC 311.',
            request: result.request
          });
        } catch (err: any) {
          sendProblemDetails(res, 400, 'Request Creation Failed', err.message, pathname);
        }
        return;
      }

      // GET /api/v1/requests/:trackingId
      if (method === 'GET' && pathname.startsWith('/api/v1/requests/')) {
        const trackingId = pathname.replace('/api/v1/requests/', '').trim();
        if (!trackingId) {
          sendProblemDetails(res, 400, 'Missing Tracking ID', 'Tracking ID parameter is required.', pathname);
          return;
        }

        const request = ticketService.getRequestByTrackingId(trackingId);
        if (!request) {
          sendProblemDetails(
            res,
            404,
            'Ticket Not Found',
            `No service ticket exists with tracking ID "${trackingId}". Please check your confirmation number.`,
            pathname
          );
          return;
        }

        sendJsonResponse(res, 200, {
          success: true,
          request
        });
        return;
      }

      // 404 Route Not Found
      sendProblemDetails(
        res,
        404,
        'Endpoint Not Found',
        `The requested resource ${pathname} does not exist on this server.`,
        pathname
      );
    } catch (err: any) {
      console.error('Unhandled server error:', err);
      sendProblemDetails(
        res,
        500,
        'Internal Server Error',
        'An unexpected condition was encountered on the civic gateway.',
        pathname
      );
    }
  });
}

// Start standalone if executed directly
const isDirectExecution = process.argv[1] && (
  process.argv[1].endsWith('server.js') || 
  process.argv[1].endsWith('server.ts')
);

if (isDirectExecution) {
  const server = createCivicServer();
  server.listen(PORT, () => {
    console.log(`[Civic Service Server] Running at http://localhost:${PORT}`);
    console.log(`[Civic Service Server] Health check: http://localhost:${PORT}/api/v1/health`);
    console.log(`[Civic Service Server] Services list: http://localhost:${PORT}/api/v1/services`);
  });
}
