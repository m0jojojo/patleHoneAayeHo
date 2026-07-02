import { getSessionToken } from '../auth/session';
import type { FrequencyComfort } from '../onboarding/constants';

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

export interface ProteinPreferenceSetting {
  proteinType: string;
  proteinLabel: string;
  frequencyComfort: FrequencyComfort;
  source: 'default' | 'explicit' | 'inferred';
}

export function getProteinSettings(): Promise<{ preferences: ProteinPreferenceSetting[] }> {
  return authedRequest('/settings/protein-preferences');
}

export function setProteinFrequency(
  proteinType: string,
  frequencyComfort: FrequencyComfort,
): Promise<{ success: true }> {
  return authedRequest('/settings/protein-frequency', {
    method: 'PATCH',
    body: JSON.stringify({ proteinType, frequencyComfort }),
  });
}
