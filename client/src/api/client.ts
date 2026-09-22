/**
 * Typed API Client for Civic Services Monorepo
 */

export interface CivicService {
  id: string;
  name: string;
  category: string;
  description: string;
  averageResolutionHours: number;
  agency: string;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
}

export interface TimelineEvent {
  status: string;
  timestamp: string;
  description: string;
  actor: string;
}

export interface ServiceRequest {
  id: string;
  trackingId: string;
  serviceId: string;
  serviceName: string;
  description: string;
  address: string;
  borough: string;
  contactEmail?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  timeline: TimelineEvent[];
}

export interface CreateRequestInput {
  serviceId: string;
  description: string;
  address: string;
  borough: string;
  contactEmail?: string;
}

export interface ApiProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  invalidParams?: Array<{ name: string; reason: string }>;
}

const API_BASE = '/api/v1';

export function announceToScreenReader(message: string): void {
  const announcer = document.getElementById('global-announcer');
  if (announcer) {
    announcer.textContent = '';
    // Small timeout ensures screen readers detect text change
    setTimeout(() => {
      announcer.textContent = message;
    }, 50);
  }
}

export async function fetchServices(): Promise<CivicService[]> {
  const res = await fetch(`${API_BASE}/services`);
  if (!res.ok) {
    throw new Error(`Failed to load civic services: ${res.statusText}`);
  }
  const data = await res.json();
  return data.services || [];
}

export async function submitServiceRequest(
  input: CreateRequestInput
): Promise<{ success: boolean; trackingId: string; request: ServiceRequest }> {
  const res = await fetch(`${API_BASE}/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, application/problem+json'
    },
    body: JSON.stringify(input)
  });

  const body = await res.json();

  if (!res.ok) {
    const problem = body as ApiProblemDetails;
    const errorMsg = problem.invalidParams 
      ? problem.invalidParams.map(p => `${p.name}: ${p.reason}`).join('; ')
      : problem.detail || 'Service request submission failed.';
    throw new Error(errorMsg);
  }

  return body;
}

export async function fetchRequestStatus(trackingId: string): Promise<ServiceRequest> {
  const cleanId = encodeURIComponent(trackingId.trim());
  const res = await fetch(`${API_BASE}/requests/${cleanId}`, {
    headers: { 'Accept': 'application/json, application/problem+json' }
  });

  const body = await res.json();

  if (!res.ok) {
    const problem = body as ApiProblemDetails;
    throw new Error(problem.detail || `Unable to locate tracking ID ${trackingId}.`);
  }

  return body.request;
}
