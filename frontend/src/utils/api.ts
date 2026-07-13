const BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000/api';


export interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: object;
  tenantId: string;
  userId: string;
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant-id': options.tenantId,
    'x-user-id': options.userId 
  };

  const config: RequestInit = {
    method: options.method || 'GET',
    headers
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Network transaction pipeline encountered an exception.');
  }

  return data as T;
}
