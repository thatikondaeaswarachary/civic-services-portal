/**
 * Core Domain Models for Civic Services Monorepo
 */

export type ServiceStatus = 
  | 'SUBMITTED' 
  | 'RECEIVED' 
  | 'DISPATCHED' 
  | 'IN_PROGRESS' 
  | 'RESOLVED';

export interface TimelineEvent {
  status: ServiceStatus;
  timestamp: string;
  description: string;
  actor: string;
}

export interface CivicService {
  id: string;
  name: string;
  category: string;
  description: string;
  averageResolutionHours: number;
  agency: string;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
}

export interface ServiceRequest {
  id: string;
  trackingId: string; // e.g. "NYC-2026-4821"
  serviceId: string;
  serviceName: string;
  description: string;
  address: string;
  borough: 'Manhattan' | 'Brooklyn' | 'Queens' | 'Bronx' | 'Staten Island';
  contactEmail?: string;
  status: ServiceStatus;
  createdAt: string;
  updatedAt: string;
  timeline: TimelineEvent[];
}

export interface CreateRequestInput {
  serviceId: string;
  description: string;
  address: string;
  borough: 'Manhattan' | 'Brooklyn' | 'Queens' | 'Bronx' | 'Staten Island';
  contactEmail?: string;
}

/**
 * RFC 7807 Problem Details Specification
 * Used to deliver accessible, machine-readable error responses.
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  invalidParams?: Array<{
    name: string;
    reason: string;
  }>;
}
