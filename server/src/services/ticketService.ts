import { CivicService, ServiceRequest, CreateRequestInput } from '../models/types.js';

export class TicketService {
  private services: CivicService[] = [
    {
      id: 'srv-pothole',
      name: 'Street Pothole Repair',
      category: 'Streets & Sidewalks',
      description: 'Report dangerous road potholes, cave-ins, and uneven asphalt on municipal roads.',
      averageResolutionHours: 48,
      agency: 'Department of Transportation (DOT)',
      urgencyLevel: 'HIGH'
    },
    {
      id: 'srv-streetlight',
      name: 'Street Light Defect or Outage',
      category: 'Public Lighting',
      description: 'Report dark lampposts, flickering lights, or exposed municipal wiring.',
      averageResolutionHours: 72,
      agency: 'Department of Transportation (DOT)',
      urgencyLevel: 'MEDIUM'
    },
    {
      id: 'srv-noise',
      name: 'Residential Noise Complaint',
      category: 'Environmental Health',
      description: 'Report excessive neighbor noise, loud music, or continuous industrial disturbance.',
      averageResolutionHours: 24,
      agency: 'Department of Environmental Protection (DEP)',
      urgencyLevel: 'MEDIUM'
    },
    {
      id: 'srv-trash',
      name: 'Illegal Dumping & Trash Overflow',
      category: 'Sanitation',
      description: 'Report hazardous dumped debris, overflowing corner baskets, or bulk waste obstruction.',
      averageResolutionHours: 36,
      agency: 'Department of Sanitation (DSNY)',
      urgencyLevel: 'HIGH'
    },
    {
      id: 'srv-heat',
      name: 'Inadequate Heat or Hot Water',
      category: 'Housing Safety',
      description: 'Report residential building heating violations during legally mandated heat season.',
      averageResolutionHours: 12,
      agency: 'Housing Preservation and Development (HPD)',
      urgencyLevel: 'EMERGENCY'
    },
    {
      id: 'srv-trees',
      name: 'Damaged Tree or Fallen Limb',
      category: 'Parks & Environment',
      description: 'Report split branches hanging over pedestrian sidewalks or fallen street trees.',
      averageResolutionHours: 24,
      agency: 'Department of Parks and Recreation (DPR)',
      urgencyLevel: 'HIGH'
    }
  ];

  private requests: Map<string, ServiceRequest> = new Map();
  private nextSequence = 4822;

  constructor() {
    this.seedInitialRequests();
  }

  private seedInitialRequests(): void {
    const seed1: ServiceRequest = {
      id: 'req-seed-01',
      trackingId: 'NYC-2026-1001',
      serviceId: 'srv-pothole',
      serviceName: 'Street Pothole Repair',
      description: 'Deep pothole in the crosswalk causing tire damage to turning transit buses.',
      address: '450 West 33rd St, New York, NY 10001',
      borough: 'Manhattan',
      contactEmail: 'citizen.alex@example.org',
      status: 'IN_PROGRESS',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString(),
      timeline: [
        {
          status: 'SUBMITTED',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          description: 'Service request lodged by citizen via Web Portal.',
          actor: 'Citizen Self-Service'
        },
        {
          status: 'RECEIVED',
          timestamp: new Date(Date.now() - 72000000).toISOString(),
          description: 'Intake triage completed by NYC 311 Operations Central.',
          actor: '311 Intake Dispatcher'
        },
        {
          status: 'DISPATCHED',
          timestamp: new Date(Date.now() - 36000000).toISOString(),
          description: 'Transferred to Department of Transportation Manhattan Road Crew #4.',
          actor: 'DOT System Gateway'
        },
        {
          status: 'IN_PROGRESS',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          description: 'Maintenance crew on-site performing asphalt milling and patch leveling.',
          actor: 'DOT Field Crew #4'
        }
      ]
    };

    const seed2: ServiceRequest = {
      id: 'req-seed-02',
      trackingId: 'NYC-2026-2045',
      serviceId: 'srv-streetlight',
      serviceName: 'Street Light Defect or Outage',
      description: 'Entire row of streetlights out along residential park perimeter.',
      address: 'Grand Army Plaza & Eastern Pkwy, Brooklyn, NY 11238',
      borough: 'Brooklyn',
      contactEmail: 'safety.warden@example.org',
      status: 'RESOLVED',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      updatedAt: new Date(Date.now() - 14400000).toISOString(),
      timeline: [
        {
          status: 'SUBMITTED',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          description: 'Service request registered via Mobile Access.',
          actor: 'Citizen Self-Service'
        },
        {
          status: 'DISPATCHED',
          timestamp: new Date(Date.now() - 120000000).toISOString(),
          description: 'Assigned to DOT Electrical Maintenance Division.',
          actor: 'DOT System Gateway'
        },
        {
          status: 'RESOLVED',
          timestamp: new Date(Date.now() - 14400000).toISOString(),
          description: 'Transformer fuse replaced. Luminaire lux levels verified at 42 lux.',
          actor: 'DOT Electrical Inspector #18'
        }
      ]
    };

    this.requests.set(seed1.trackingId, seed1);
    this.requests.set(seed2.trackingId, seed2);
  }

  public listServices(): CivicService[] {
    return [...this.services];
  }

  public getServiceById(id: string): CivicService | undefined {
    return this.services.find(s => s.id === id);
  }

  public createRequest(input: CreateRequestInput): { request: ServiceRequest; trackingId: string } {
    const service = this.getServiceById(input.serviceId);
    if (!service) {
      throw new Error(`Invalid service ID: ${input.serviceId}`);
    }

    const trackingId = `NYC-2026-${this.nextSequence++}`;
    const id = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    const request: ServiceRequest = {
      id,
      trackingId,
      serviceId: input.serviceId,
      serviceName: service.name,
      description: input.description,
      address: input.address,
      borough: input.borough,
      contactEmail: input.contactEmail,
      status: 'SUBMITTED',
      createdAt: now,
      updatedAt: now,
      timeline: [
        {
          status: 'SUBMITTED',
          timestamp: now,
          description: 'Service request submitted successfully and queued for agency review.',
          actor: 'Citizen Portal'
        }
      ]
    };

    this.requests.set(trackingId, request);
    return { request, trackingId };
  }

  public getRequestByTrackingId(trackingId: string): ServiceRequest | undefined {
    return this.requests.get(trackingId.trim().toUpperCase());
  }

  public listAllRequests(): ServiceRequest[] {
    return Array.from(this.requests.values());
  }
}

export const ticketService = new TicketService();
