const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const TOKEN_KEY = 'squadlink_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiRequestError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  skipAuth?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    signal,
    skipAuth = false,
  } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (!skipAuth) {
    const token = getToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw new ApiRequestError(0, 'Network error — please check your connection and try again.');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let json: unknown;
  const text = await response.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiRequestError(response.status, 'Unexpected response from server.');
  }

  if (!response.ok) {
    const errorBody = json as { message?: string; error?: string; details?: unknown } | null;
    const message =
      errorBody?.message ||
      getErrorMessage(response.status);
    throw new ApiRequestError(response.status, message, errorBody?.details);
  }

  return json as T;
}

function getErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'The request was invalid. Please check your input and try again.';
    case 401:
      return 'Your session has expired. Please log in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'A conflict occurred — the resource may already exist or be in an incompatible state.';
    case 422:
      return 'The submitted data failed validation. Please review and try again.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'A server error occurred. Please try again later.';
    case 502:
    case 503:
    case 504:
      return 'The server is temporarily unavailable. Please try again later.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

export { API_BASE_URL };
