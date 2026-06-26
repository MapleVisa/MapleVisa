// Renders a user's profile image, or their initials as a fallback. The image is
// served (auth-checked) from /api/avatar/[id] and cache-busted by avatarKey.
export default function Avatar({
  id,
  name,
  avatarKey,
  className = "h-9 w-9",
}: {
  id: string;
  name: string;
  avatarKey?: string | null;
  className?: string;
}) {
  if (avatarKey) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/avatar/${id}?v=${encodeURIComponent(avatarKey)}`}
        alt={name}
        className={`${className} rounded-full object-cover ring-1 ring-ink-200`}
      />
    );
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <div
      className={`${className} flex items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 ring-1 ring-brand-200`}
      aria-hidden="true"
    >
      {initials || "?"}
    </div>
  );
}
