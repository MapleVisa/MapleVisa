"use client";

// Live password strength meter + a checklist of things that improve strength.
const CRITERIA: { label: string; test: (p: string) => boolean }[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "Upper and lowercase letters", test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "At least one number", test: (p) => /\d/.test(p) },
  { label: "At least one symbol (! ? @ # …)", test: (p) => /[^A-Za-z0-9]/.test(p) },
  { label: "12 or more characters", test: (p) => p.length >= 12 },
];

const LEVELS = [
  { label: "Too weak", bar: "bg-red-500", text: "text-red-600" },
  { label: "Weak", bar: "bg-orange-500", text: "text-orange-600" },
  { label: "Fair", bar: "bg-amber-500", text: "text-amber-600" },
  { label: "Good", bar: "bg-lime-500", text: "text-lime-600" },
  { label: "Strong", bar: "bg-green-600", text: "text-green-700" },
];

export default function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const results = CRITERIA.map((c) => ({ label: c.label, ok: c.test(password) }));
  const score = results.filter((r) => r.ok).length; // 0..5
  const band = score <= 1 ? 0 : score - 1; // map score -> color band (0..4)
  const level = LEVELS[band];
  const pct = Math.max(8, (score / CRITERIA.length) * 100);

  return (
    <div className="mt-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
        <div className={`h-full rounded-full transition-all duration-300 ${level.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`mt-1 text-xs font-semibold ${level.text}`}>Password strength: {level.label}</p>

      <ul className="mt-2 space-y-1">
        {results.map((r) => (
          <li
            key={r.label}
            className={`flex items-center gap-1.5 text-xs ${r.ok ? "text-emerald-600" : "text-ink-400"}`}
          >
            <span className="w-3 text-center">{r.ok ? "✓" : "○"}</span>
            <span>{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
