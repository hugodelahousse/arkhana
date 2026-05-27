import { useState, useEffect } from "react";
import type { Route } from "./+types/push";

export function meta() {
  return [{ title: "Push Lab — Arkhana" }];
}

export function loader({ context }: Route.LoaderArgs) {
  const u = context.user as { id: string; isAnonymous: boolean } | null;
  return {
    user: u ? { id: u.id, isAnonymous: u.isAnonymous } : null,
  };
}

type Status = "loading" | "unsupported" | "no-vapid" | "unsubscribed" | "subscribed";
type NotificationType = "daily-reminder" | "milestone" | "celestial";
type Permission = "default" | "granted" | "denied";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export default function PushLab({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  const [status, setStatus] = useState<Status>("loading");
  const [permission, setPermission] = useState<Permission>("default");
  const [swActive, setSwActive] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  function addLog(msg: string) {
    setLog((prev) => [...prev, `${new Date().toLocaleTimeString()} — ${msg}`]);
  }

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }

      setPermission(Notification.permission as Permission);

      const keyRes = await fetch("/api/push/vapid-public-key");
      if (!keyRes.ok) {
        setStatus("no-vapid");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      setSwActive(!!reg.active);
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "subscribed" : "unsubscribed");

      if (reg.waiting) {
        addLog("New service worker waiting — close all tabs and reopen to activate it");
      }
      if (!reg.active) {
        addLog("No active service worker — push events won't fire. SW may be disabled in dev mode.");
      }
    })();
  }, []);

  async function subscribe() {
    try {
      const keyRes = await fetch("/api/push/vapid-public-key");
      const { publicKey } = await keyRes.json();

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        addLog(`Permission denied: ${permission}`);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (res.ok) {
        setStatus("subscribed");
        addLog("Subscribed successfully");
      } else {
        addLog(`Subscribe failed: ${res.status}`);
      }
    } catch (err) {
      addLog(`Error: ${err}`);
    }
  }

  async function unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;

      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
      setStatus("unsubscribed");
      addLog("Unsubscribed");
    } catch (err) {
      addLog(`Error: ${err}`);
    }
  }

  async function sendTest(type: NotificationType) {
    setSending(true);
    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        addLog(`Failed: ${res.status} ${body.error ?? ""}`);
      } else if (!body.vapidConfigured) {
        addLog("VAPID not configured — set keys in .env and restart");
      } else if (body.subscriptionCount === 0) {
        addLog("No subscriptions found for your user — try unsubscribing and resubscribing");
      } else {
        const failed = body.results?.filter((r: { ok: boolean }) => !r.ok) ?? [];
        if (failed.length > 0) {
          for (const f of failed) addLog(`Delivery failed: ${f.error}`);
        } else {
          addLog(`Sent "${type}" to ${body.subscriptionCount} subscription(s)`);
        }
      }
    } catch (err) {
      addLog(`Error: ${err}`);
    } finally {
      setSending(false);
    }
  }

  const notificationTypes: { type: NotificationType; label: string; description: string }[] = [
    { type: "daily-reminder", label: "Daily Reminder", description: "A card is waiting." },
    { type: "milestone", label: "Milestone", description: "Seven days streak message." },
    { type: "celestial", label: "Celestial", description: "Full moon notification." },
  ];

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-light tracking-widest text-primary font-serif">
            Push Lab
          </h1>
          <p className="text-xs tracking-widest uppercase opacity-40 text-primary">
            Test push notifications
          </p>
        </div>

        {/* Status */}
        <div className="p-5 border border-muted bg-card space-y-4">
          <p className="text-[0.6rem] tracking-[0.15em] uppercase opacity-40 text-primary">
            Status
          </p>
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${
              user ? "bg-green-500" : "bg-red-500"
            }`} />
            <span className="text-sm text-primary font-serif">
              {!user ? "No session — visit the home page first" :
               user.isAnonymous ? `Anonymous user (${user.id.slice(0, 8)}…)` :
               `Signed in (${user.id.slice(0, 8)}…)`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${
              status === "subscribed" ? "bg-green-500" :
              status === "unsubscribed" ? "bg-yellow-500" :
              status === "no-vapid" ? "bg-red-500" :
              status === "unsupported" ? "bg-red-500" :
              "bg-muted-foreground"
            }`} />
            <span className="text-sm text-primary font-serif">
              {status === "loading" && "Checking..."}
              {status === "unsupported" && "Push not supported in this browser"}
              {status === "no-vapid" && "VAPID keys not configured — set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env"}
              {status === "unsubscribed" && "Not subscribed"}
              {status === "subscribed" && "Subscribed"}
            </span>
          </div>

          {status !== "loading" && status !== "unsupported" && (
            <>
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${swActive ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-sm text-primary font-serif">
                  Service worker: {swActive ? "active" : "not active"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${
                  permission === "granted" ? "bg-green-500" :
                  permission === "denied" ? "bg-red-500" :
                  "bg-yellow-500"
                }`} />
                <span className="text-sm text-primary font-serif">
                  Notification permission: {permission}
                </span>
              </div>
            </>
          )}

          {status === "unsubscribed" && (
            <button
              onClick={subscribe}
              className="px-6 py-2 text-[0.7rem] tracking-[0.15em] uppercase cursor-pointer border border-border bg-transparent text-primary font-serif hover:opacity-90 transition-opacity"
            >
              Subscribe
            </button>
          )}
          {status === "subscribed" && (
            <button
              onClick={unsubscribe}
              className="px-6 py-2 text-[0.7rem] tracking-[0.15em] uppercase cursor-pointer border border-border bg-transparent text-primary font-serif hover:opacity-90 transition-opacity"
            >
              Unsubscribe
            </button>
          )}
        </div>

        {/* Test buttons */}
        {status === "subscribed" && (
          <div className="p-5 border border-muted bg-card space-y-4">
            <p className="text-[0.6rem] tracking-[0.15em] uppercase opacity-40 text-primary">
              Send Test
            </p>
            <div className="flex flex-wrap gap-3">
              {notificationTypes.map(({ type, label, description }) => (
                <button
                  key={type}
                  onClick={() => sendTest(type)}
                  disabled={sending}
                  className="flex flex-col items-start gap-1 px-4 py-3 text-left border border-border bg-transparent cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="text-[0.7rem] tracking-[0.12em] uppercase text-primary font-serif">
                    {label}
                  </span>
                  <span className="text-[0.6rem] text-muted-foreground opacity-60">
                    {description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div className="p-5 border border-muted bg-card space-y-2">
            <p className="text-[0.6rem] tracking-[0.15em] uppercase opacity-40 text-primary">
              Log
            </p>
            <div className="space-y-1 font-mono text-xs text-muted-foreground opacity-70 max-h-48 overflow-y-auto">
              {log.map((entry, i) => (
                <p key={i}>{entry}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
