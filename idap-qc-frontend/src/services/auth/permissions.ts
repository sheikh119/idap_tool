export type Permission =
  | "issue:create"
  | "issue:update"
  | "report:create"
  | "report:submit"
  | "report:review"
  | "report:approve"
  | "catalogue:manage"
  | "admin:manage";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  projectPermissions: Record<string, Permission[]>;
}

export function can(user: SessionUser | null, permission: Permission, projectId: string) {
  return user?.projectPermissions[projectId]?.includes(permission) ?? false;
}
