/**
 * The single place `fetch` is called. Components never touch it directly.
 * When the real Spring Boot service arrives, only BASE_URL changes.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class ApiError extends Error {
  // Declared explicitly rather than as a constructor parameter property:
  // Vite's `erasableSyntaxOnly` forbids TS syntax that emits runtime code.
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiGet<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    // Surface the server's message when it sends one — generic
    // "Something went wrong" text is useless to the user.
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch {
      /* response had no JSON body; keep the default message */
    }
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}
