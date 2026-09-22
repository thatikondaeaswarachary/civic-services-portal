/**
 * Civic Services Portal - Authentication & Session Simulation
 * Conforms to WCAG 2.2 AA and Section 508 accessibility guidelines.
 */

export type UserRole = 'RESIDENT' | 'DISPATCHER';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  borough: string;
  initials: string;
  avatarBadgeColor: string;
  token: string;
}

export const PRESET_PERSONAS: Record<UserRole, UserProfile> = {
  RESIDENT: {
    id: 'usr-resident-01',
    name: 'Elena Rostova',
    email: 'elena.rostova@brooklyn.citizen.nyc',
    role: 'RESIDENT',
    title: 'Verified Resident (Brooklyn)',
    borough: 'Brooklyn',
    initials: 'ER',
    avatarBadgeColor: '#0284c7', // Sky blue
    token: 'mock-jwt-token-resident-nyc-311-2026'
  },
  DISPATCHER: {
    id: 'usr-dispatcher-01',
    name: 'Marcus Vance',
    email: 'marcus.vance@dot.nyc.gov',
    role: 'DISPATCHER',
    title: 'DOT Dispatch Commander (Admin)',
    borough: 'Manhattan',
    initials: 'MV',
    avatarBadgeColor: '#d97706', // Amber gold
    token: 'mock-jwt-token-dispatcher-admin-nyc-311-2026'
  }
};

export class AuthManager {
  private static instance: AuthManager;
  private readonly STORAGE_KEY = 'civic_auth_session';
  private currentUser: UserProfile;
  private listeners: Array<(user: UserProfile) => void> = [];

  private constructor() {
    this.currentUser = this.loadPersistedSession();
  }

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  private loadPersistedSession(): UserProfile {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(this.STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as UserProfile;
          if (parsed && parsed.id && parsed.role) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Unable to read persisted session from localStorage:', e);
    }
    // Default initial user: Resident (Elena Rostova)
    return PRESET_PERSONAS.RESIDENT;
  }

  public getCurrentUser(): UserProfile {
    return this.currentUser;
  }

  public isDispatcher(): boolean {
    return this.currentUser.role === 'DISPATCHER';
  }

  public isResident(): boolean {
    return this.currentUser.role === 'RESIDENT';
  }

  public loginWithPersona(role: UserRole): UserProfile {
    const persona = PRESET_PERSONAS[role];
    return this.setSession(persona);
  }

  public loginCustom(name: string, email: string, role: UserRole, borough: string): UserProfile {
    const initials = name
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'CU';

    const customProfile: UserProfile = {
      id: `usr-custom-${Date.now()}`,
      name,
      email,
      role,
      title: role === 'DISPATCHER' ? 'Municipal Operations Officer' : `Resident (${borough})`,
      borough,
      initials,
      avatarBadgeColor: role === 'DISPATCHER' ? '#d97706' : '#0284c7',
      token: `mock-jwt-custom-${Date.now()}`
    };

    return this.setSession(customProfile);
  }

  public logout(): UserProfile {
    // Reset to unauthenticated/guest or default resident
    return this.loginWithPersona('RESIDENT');
  }

  private setSession(profile: UserProfile): UserProfile {
    this.currentUser = profile;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profile));
      }
    } catch (e) {
      console.warn('Unable to persist session to localStorage:', e);
    }

    this.notifyListeners();
    return this.currentUser;
  }

  public onAuthStateChanged(listener: (user: UserProfile) => void): () => void {
    this.listeners.push(listener);
    // Immediately call listener with current state
    listener(this.currentUser);

    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentUser);
      } catch (err) {
        console.error('Error invoking auth listener:', err);
      }
    }
  }
}
