"use client";

import { Select } from "@/components/ui";
import { setActorId, useActorId } from "../_lib/client";
import { useUsers } from "../_lib/queries";

export function ActorSwitcher() {
  const actorId = useActorId();
  const { data: users, error } = useUsers();
  const actor = users?.find((user) => user.id === actorId);

  return (
    <div className="grid gap-1">
      <label htmlFor="actor" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Acting as
      </label>
      <Select id="actor" value={actorId ?? ""} onChange={(event) => setActorId(event.target.value || null)}>
        <option value="">— nobody (no x-actor-id header) —</option>
        {users?.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} · {user.role_name.replaceAll("_", " ")}
            {user.is_active ? "" : " (inactive)"}
          </option>
        ))}
      </Select>
      {error && <p className="text-xs text-red-700">Could not load users: {error.message}</p>}
      {actor && <p className="font-mono text-[11px] text-slate-500">{actor.id}</p>}
    </div>
  );
}
