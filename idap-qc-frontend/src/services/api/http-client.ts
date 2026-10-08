export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  if (!API_URL) {
    throw new ApiError("The backend API URL is not configured.", 503);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const details = await response.json().catch(() => undefined);
    throw new ApiError(
      (details as { message?: string } | undefined)?.message ?? "The request failed.",
      response.status,
      details,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
