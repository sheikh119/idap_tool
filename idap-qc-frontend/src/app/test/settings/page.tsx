"use client";

import { useQuery } from "@tanstack/react-query";
import { Button, PageHeader } from "@/components/ui";
import { ROLE_NAMES } from "@/lib/db/enums";
import { ErrorNote, JsonView, Panel, SuccessNote } from "../_components/kit";
import { api } from "../_lib/client";
import { useApiMutation } from "../_lib/queries";

type Setting = { key: string; value: unknown; updated_at: string };

const ROLE_SETTINGS = [
  { key: "allowed_review_start_roles", label: "Roles that may start a review" },
  { key: "allowed_reject_roles", label: "Roles that may reject a report" },
] as const;

export default function SettingsPage() {
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => api<Setting[]>("/settings"), staleTime: 0 });
  const save = useApiMutation((body: { key: string; value: unknown }) => api("/settings", { method: "PATCH", body }));

  const valueOf = (key: string) => settings.data?.find((setting) => setting.key === key)?.value;
  const requireImages = valueOf("require_issue_images_on_submit") === true;

  return (
    <>
      <PageHeader
        title="App settings"
        description="GET/PATCH /api/settings. These rules are read by the workflow procedures, so changes apply to the next action."
      />
      <ErrorNote error={settings.error ?? save.error} />
      {save.isSuccess && <SuccessNote>Saved {save.data?.key}</SuccessNote>}

      <Panel
        title="Require images on submit"
        description="When on, submitting a report fails if any of its issues has no image. The seed turns this off (image upload is not built yet)."
      >
        <div className="flex items-center gap-3">
          <span className="text-sm">
            Currently <strong>{requireImages ? "ON" : "OFF"}</strong>
          </span>
          <Button
            type="button"
            variant="secondary"
            disabled={!settings.data || save.isPending}
            onClick={() => save.mutate({ key: "require_issue_images_on_submit", value: !requireImages })}
          >
            Turn {requireImages ? "off" : "on"}
          </Button>
        </div>
      </Panel>

      {ROLE_SETTINGS.map(({ key, label }) => {
        const roles = (valueOf(key) as string[] | undefined) ?? [];
        return (
          <Panel key={key} title={label} description={`${key} (approval and reopen are always GENERAL_MANAGER only)`}>
            <div className="flex flex-wrap gap-4">
              {ROLE_NAMES.map((role) => (
                <label key={role} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={roles.includes(role)}
                    disabled={!settings.data || save.isPending}
                    onChange={(event) =>
                      save.mutate({
                        key,
                        value: event.target.checked ? [...roles, role] : roles.filter((value) => value !== role),
                      })
                    }
                  />
                  {role.replaceAll("_", " ")}
                </label>
              ))}
            </div>
          </Panel>
        );
      })}

      <JsonView value={settings.data} />
    </>
  );
}
