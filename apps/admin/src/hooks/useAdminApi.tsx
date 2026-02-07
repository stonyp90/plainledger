'use client';

import { useCallback } from 'react';
import { useAdmin } from './useAdmin';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function useAdminApi() {
  const { token } = useAdmin();

  const apiFetch = useCallback(
    async <T = unknown>(
      endpoint: string,
      options: RequestInit = {}
    ): Promise<T> => {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      }

      const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
      
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.text().catch(() => 'Unknown error');
        throw new Error(`API Error ${response.status}: ${error}`);
      }

      return response.json();
    },
    [token]
  );

  return { apiFetch, token, API_URL };
}
