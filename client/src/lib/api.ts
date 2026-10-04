/**
 * API client with automatic JWT bearer attachment and token refresh on 401.
 */

function getInitialToken(): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return localStorage.getItem('beacon_access_token');
    } catch {
      return null;
    }
  }
  return null;
}

let currentAccessToken: string | null = getInitialToken();

export function setClientAccessToken(token: string | null): void {
  currentAccessToken = token;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      if (token) {
        localStorage.setItem('beacon_access_token', token);
      } else {
        localStorage.removeItem('beacon_access_token');
      }
    } catch {
      // Ignore storage error
    }
  }
}

export function getClientAccessToken(): string | null {
  return currentAccessToken;
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { skipAuth, headers = {}, ...rest } = options;

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (!skipAuth && currentAccessToken) {
    reqHeaders['Authorization'] = `Bearer ${currentAccessToken}`;
  }

  let response = await fetch(endpoint, {
    ...rest,
    headers: reqHeaders,
    credentials: 'include', // send cookies for refresh token
  });

  // Handle 401 - try refreshing token once
  if (
    response.status === 401 &&
    !skipAuth &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/refresh')
  ) {
    const refreshSuccess = await attemptRefreshToken();
    if (refreshSuccess && currentAccessToken) {
      reqHeaders['Authorization'] = `Bearer ${currentAccessToken}`;
      response = await fetch(endpoint, {
        ...rest,
        headers: reqHeaders,
        credentials: 'include',
      });
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      data?.error?.message || data?.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg) as Error & {
      code?: string;
      status: number;
      fields?: Record<string, string[]>;
    };
    err.code = data?.error?.code;
    err.status = response.status;
    err.fields = data?.error?.fields;
    throw err;
  }

  return data;
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function attemptRefreshToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        setClientAccessToken(null);
        return false;
      }

      const data = await res.json();
      if (data?.data?.accessToken) {
        setClientAccessToken(data.data.accessToken);
        return true;
      }

      setClientAccessToken(null);
      return false;
    } catch {
      setClientAccessToken(null);
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
