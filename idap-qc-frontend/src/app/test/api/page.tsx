"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { ErrorNote, JsonView, Panel } from "../_components/kit";
import { rawApi, setActorId, useActorId, type RawResponse } from "../_lib/client";
import { useUsers } from "../_lib/queries";
import { PRESETS } from "../_lib/seed";

const METHODS = ["GET", "POST", "PATCH", "DELETE"] as const;

type HistoryEntry = RawResponse & { method: string; path: string; at: string };

export default function ApiConsolePage() {
  const actorId = useActorId();
  const { data: users } = useUsers();
  const [method, setMethod] = useState<string>("GET");
  const [path, setPath] = useState("/health");
  const [body, setBody] = useState("");
  const [sendActor, setSendActor] = useState(true);
  const [expect, setExpect] = useState<string>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>();
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const actorName = users?.find((user) => user.id === actorId)?.name;

  function applyPreset(index: string) {
    const preset = PRESETS[Number(index)];
    if (!preset) return;
    setMethod(preset.method);
    setPath(preset.path);
    setBody(preset.body === undefined ? "" : JSON.stringify(preset.body, null, 2));
    setExpect(preset.expect);
    if (preset.actor) setActorId(preset.actor);
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    let parsed: string | undefined;
    if (body.trim() && method !== "GET") {
      try {
        parsed = JSON.stringify(JSON.parse(body));
      } catch {
        setError(new Error("Body is not valid JSON"));
        return;
      }
    }
    setPending(true);
    try {
      const response = await rawApi(path.startsWith("/") ? path : `/${path}`, { method, body: parsed, sendActor });
      setHistory((entries) => [{ ...response, method, path, at: new Date().toLocaleTimeString() }, ...entries].slice(0, 20));
    } catch (requestError) {
      setError(requestError);
    } finally {
      setPending(false);
    }
  }

  const latest = history[0];

  return (
    <>
      <PageHeader title="API console" description="Send any request to /api. ✗ presets are expected to fail." />

      <Panel title="Request">
        <form onSubmit={send} className="grid gap-4">
          <Field label="Preset">
            <Select defaultValue="" onChange={(event) => applyPreset(event.target.value)}>
              <option value="">— choose a preset —</option>
              {PRESETS.map((preset, index) => (
                <option key={preset.label} value={index}>
                  {preset.method} · {preset.label}
                </option>
              ))}
            </Select>
          </Field>
          {expect && <p className="text-sm text-amber-700">Expected: {expect}</p>}
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <Field label="Method">
              <Select value={method} onChange={(event) => setMethod(event.target.value)}>
                {METHODS.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </Select>
            </Field>
            <Field label="Path (after /api)">
              <Input value={path} onChange={(event) => setPath(event.target.value)} className="font-mono" />
            </Field>
          </div>
          {method !== "GET" && (
            <Field label="JSON body">
              <Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={8} className="font-mono text-xs" />
            </Field>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sendActor} onChange={(event) => setSendActor(event.target.checked)} />
            Send x-actor-id header ({actorName ?? "no acting user selected"})
          </label>
          <ErrorNote error={error} />
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send"}
            </Button>
          </div>
        </form>
      </Panel>

      {latest && (
        <Panel
          title={`Response · ${latest.status}`}
          description={`${latest.method} /api${latest.path} · ${latest.ms} ms`}
          className={latest.ok ? "border-emerald-200" : "border-red-200"}
        >
          <JsonView value={latest.json} label="Body" open />
        </Panel>
      )}

      {history.length > 1 && (
        <Panel title="Recent requests">
          <ul className="grid gap-2 text-sm">
            {history.slice(1).map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="grid gap-1">
                <p className="font-mono text-xs">
                  <span className={entry.ok ? "text-emerald-700" : "text-red-700"}>{entry.status}</span> {entry.method}{" "}
                  /api{entry.path} · {entry.ms} ms · {entry.at}
                </p>
                <JsonView value={entry.json} label="Body" />
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
