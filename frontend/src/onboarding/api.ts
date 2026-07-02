import { getSessionToken } from '../auth/session';
import type { ActivityLevel, DietType, Goal, Sex } from './constants';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8787';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function authedRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getSessionToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, (data as { error?: string }).error ?? 'Something went wrong');
  }
  return data as T;
}

export function saveGoal(goal: Goal): Promise<{ success: true }> {
  return authedRequest('/onboarding/goal', { method: 'PATCH', body: JSON.stringify({ goal }) });
}

export function saveDietType(dietType: DietType): Promise<{ success: true }> {
  return authedRequest('/onboarding/diet-type', { method: 'PATCH', body: JSON.stringify({ dietType }) });
}

export function saveProteinPreferences(proteinIds: string[]): Promise<{ success: true }> {
  return authedRequest('/onboarding/protein-preferences', {
    method: 'PATCH',
    body: JSON.stringify({ proteinIds }),
  });
}

export interface BodyStats {
  height: number;
  weight: number;
  age: number;
  activityLevel: ActivityLevel;
  sex: Sex;
}

export function saveBodyStats(stats: BodyStats): Promise<{ success: true }> {
  return authedRequest('/onboarding/body-stats', { method: 'PATCH', body: JSON.stringify(stats) });
}

export function completeOnboarding(): Promise<{ success: true }> {
  return authedRequest('/onboarding/complete', { method: 'POST' });
}

export interface OnboardingStatus {
  goal: Goal | null;
  dietType: DietType | null;
  proteinPreferences: string[];
  bodyStats: BodyStats | null;
  completed: boolean;
}

export function getOnboardingStatus(): Promise<OnboardingStatus> {
  return authedRequest('/onboarding/status');
}
