"use client";

import { useSyncExternalStore } from "react";

const ACTOR_KEY = "qc-test-actor";
const ACTOR_HEADER = "x-actor-id";
const listeners = new Set<() => void>();

export function getActorId(): string | null {
  return typeof window === "undefined" ? null : window.localStorage.getItem(ACTOR_KEY);
}

export function setActorId(id: string | null) {
  if (id) window.localStorage.setItem(ACTOR_KEY, id);
  else window.localStorage.removeItem(ACTOR_KEY);
  listeners.forEach((listener) => listener());
}

function subscribeActor(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useActorId() {
  return useSyncExternalStore(subscribeActor, getActorId, () => null);
}

export class TestApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "TestApiError";
  }
}

type RequestOptions = { method?: string; body?: unknown; sendActor?: boolean };

export type RawResponse = { status: number; ok: boolean; ms: number; json: unknown };

/** Low-level call used by the API console: never throws on HTTP errors. */
export async function rawApi(path: string, { method = "GET", body, sendActor = true }: RequestOptions = {}): Promise<RawResponse> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const actor = getActorId();
  if (sendActor && actor) headers[ACTOR_HEADER] = actor;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const started = performance.now();
  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, ok: response.ok, ms: Math.round(performance.now() - started), json };
}

/** Returns `data` from the `{ data }` envelope or throws TestApiError with the server's message. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function api<T = any>(path: string, options?: RequestOptions): Promise<T> {
  const { status, ok, json } = await rawApi(path, options);
  const envelope = json as { data?: T; error?: { message?: string; code?: string; details?: unknown } } | null;
  if (!ok) {
    throw new TestApiError(envelope?.error?.message ?? `HTTP ${status}`, status, envelope?.error?.code, envelope?.error?.details);
  }
  return envelope?.data as T;
}

export function query(params: Record<string, string | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const text = search.toString();
  return text ? `?${text}` : "";
}

type FormField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/**
 * Reads named form fields into a JSON body. Empty fields are omitted
 * (or sent as null with `data-nullable`); `data-kind="number"` converts to numbers;
 * checkboxes become booleans.
 */
export function readForm(form: HTMLFormElement): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const element of Array.from(form.elements)) {
    const field = element as FormField;
    if (!field.name || !("value" in field)) continue;
    if (field instanceof HTMLInputElement && field.type === "checkbox") {
      body[field.name] = field.checked;
      continue;
    }
    const value = field.value.trim();
    if (value === "") {
      if (field.dataset.nullable !== undefined) body[field.name] = null;
      continue;
    }
    body[field.name] = field.dataset.kind === "number" ? Number(value) : value;
  }
  return body;
}
