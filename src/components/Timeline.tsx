type Event = {
  id: string;
  type: string;
  message: string;
  actor: string | null;
  createdAt: Date | string;
};

const ICONS: Record<string, string> = {
  STATUS: "🔵",
  NOTE: "💬",
  SYSTEM: "⚙️",
};

export default function Timeline({ events }: { events: Event[] }) {
  if (!events.length) return null;
  return (
    <ul className="space-y-4">
      {events.map((e) => (
        <li key={e.id} className="flex gap-3">
          <span className="mt-0.5 text-sm">{ICONS[e.type] ?? "•"}</span>
          <div>
            <p className="text-sm text-ink-800">{e.message}</p>
            <p className="text-xs text-ink-400">
              {e.actor ? `${e.actor} · ` : ""}
              {new Date(e.createdAt).toLocaleString("en-CA", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
