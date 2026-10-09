import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { connection, type NextRequest } from "next/server";
import { z, type ZodTypeAny } from "zod";
import type { RoleName } from "@/lib/db/enums";
import { getSupabase } from "@/lib/supabase/server";

export { getSupabase as db };

/** Development-only identity: test pages send the acting user's id in this header. */
export const ACTOR_HEADER = "x-actor-id";

export type Params<P> = { params: Promise<P> };
export type IdParams = Params<{ id: string }>;

export type Actor = { id: string; name: string; role_name: RoleName; is_active: boolean };

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

const POSTGRES_ERROR_STATUS: Record<string, number> = {
  "23505": 409, // unique_violation
  "23503": 409, // foreign_key_violation
  "23514": 400, // check_violation
  "23502": 400, // not_null_violation
  "22P02": 400, // invalid uuid / enum / number text
  "22007": 400, // invalid datetime format
  "22008": 400, // datetime out of range
  P0001: 422, // RAISE EXCEPTION from a trigger/procedure (business rule)
  P0002: 404, // RAISE ... USING ERRCODE 'P0002' (not found)
  PGRST116: 404, // .single() matched no rows
  PGRST202: 501, // function missing: schema not applied
};

function fromPostgrest(error: PostgrestError) {
  return new HttpError(
    POSTGRES_ERROR_STATUS[error.code] ?? 500,
    error.message,
    error.code,
    error.details || error.hint || undefined,
  );
}

// No generated Database types yet: rows are `any` unless a caller passes T explicitly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function unwrap<T = any>(result: { data: unknown; error: PostgrestError | null }): T {
  if (result.error) throw fromPostgrest(result.error);
  return result.data as T;
}

export function notFound(what: string): never {
  throw new HttpError(404, `${what} not found`, "NOT_FOUND");
}

function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return Response.json(
      { error: { message: error.message, code: error.code, details: error.details } },
      { status: error.status },
    );
  }
  console.error(error);
  const message = error instanceof Error ? error.message : "Unexpected error";
  return Response.json({ error: { message, code: "INTERNAL" } }, { status: 500 });
}

/**
 * Wraps a route handler: always runs at request time, returns `{ data }` on success
 * and `{ error: { message, code, details } }` with a mapped HTTP status on failure.
 */
export function route<C = unknown>(
  handler: (request: NextRequest, context: C) => Promise<unknown>,
  successStatus = 200,
) {
  return async (request: NextRequest, context: C) => {
    await connection();
    try {
      const data = await handler(request, context);
      return Response.json({ data: data ?? null }, { status: successStatus });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export async function parseBody<S extends ZodTypeAny>(request: Request, schema: S): Promise<z.infer<S>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON", "INVALID_JSON");
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new HttpError(400, "Validation failed", "VALIDATION", result.error.flatten());
  }
  return result.data;
}

/** Schema for PATCH bodies: unknown keys rejected, at least one field required. */
export function patchSchema<T extends z.ZodRawShape>(shape: T) {
  return z
    .object(shape)
    .partial()
    .strict()
    .refine((value) => Object.keys(value).length > 0, { message: "Provide at least one field to update" });
}

export const uuid = z.string().uuid();
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
export const optionalText = z.string().trim().nullable().optional();

export function param(request: NextRequest, name: string): string | undefined {
  const value = request.nextUrl.searchParams.get(name)?.trim();
  return value ? value : undefined;
}

export function listParam(request: NextRequest, name: string): string[] | undefined {
  const values = param(request, name)
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return values?.length ? values : undefined;
}

export function boolParam(request: NextRequest, name: string): boolean | undefined {
  const value = param(request, name);
  if (value === undefined) return undefined;
  return value === "true" || value === "1";
}

/** Builds an ilike pattern; strips characters that would break PostgREST `or()` filters. */
export function searchPattern(term: string) {
  return `%${term.replace(/[,()%*\\]/g, " ").trim()}%`;
}

export function pageParams(request: NextRequest) {
  const limit = Math.min(Math.max(Number(param(request, "limit")) || 100, 1), 500);
  const offset = Math.max(Number(param(request, "offset")) || 0, 0);
  return { limit, offset, from: offset, to: offset + limit - 1 };
}

export function pageResult(
  result: { data: unknown; error: PostgrestError | null; count: number | null },
  page: { limit: number; offset: number },
) {
  return { items: unwrap<unknown[]>(result) ?? [], total: result.count ?? 0, limit: page.limit, offset: page.offset };
}

export async function requireActor(request: NextRequest): Promise<Actor> {
  const id = request.headers.get(ACTOR_HEADER);
  if (!id) throw new HttpError(401, `Missing ${ACTOR_HEADER} header: pick an acting user`, "NO_ACTOR");
  if (!uuid.safeParse(id).success) throw new HttpError(400, `${ACTOR_HEADER} must be a UUID`, "BAD_ACTOR");

  const user = unwrap<Actor | null>(
    await getSupabase().from("users").select("id, name, role_name, is_active").eq("id", id).maybeSingle(),
  );
  if (!user) throw new HttpError(401, "Acting user not found", "NO_ACTOR");
  if (!user.is_active) throw new HttpError(403, `${user.name} is inactive`, "INACTIVE_USER");
  return user;
}

export async function assertProjectAccess(actor: Actor, projectId: string) {
  const allowed = unwrap<boolean>(
    await getSupabase().rpc("fn_user_has_project_access", { p_user_id: actor.id, p_project_id: projectId }),
  );
  if (!allowed) {
    throw new HttpError(403, `${actor.name} is not assigned to this project`, "NO_PROJECT_ACCESS");
  }
}

export type ReportRef = { id: string; project_id: string; package_id: string | null; status: string };

export async function getReportRef(id: string): Promise<ReportRef> {
  const report = unwrap<ReportRef | null>(
    await getSupabase().from("reports").select("id, project_id, package_id, status").eq("id", id).maybeSingle(),
  );
  return report ?? notFound("Report");
}
