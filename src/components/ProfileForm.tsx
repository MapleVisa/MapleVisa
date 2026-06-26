"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";

export default function ProfileForm({
  id,
  initial,
}: {
  id: string;
  initial: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    avatarKey: string | null;
  };
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(initial.fullName);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [address, setAddress] = useState(initial.address);
  const [avatarKey, setAvatarKey] = useState(initial.avatarKey);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not upload the image.");
      return;
    }
    // Force a fresh avatar key so the <img> cache-busts.
    setAvatarKey(`uploaded-${Date.now()}`);
    router.refresh();
  }

  async function save() {
    setError("");
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, phone, address }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not save your profile.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  }

  return (
    <div className="card p-6">
      {error && <p className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{error}</p>}
      {saved && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Profile saved.
        </p>
      )}

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <Avatar id={id} name={fullName || "?"} avatarKey={avatarKey} className="h-20 w-20" />
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-secondary"
          >
            {uploading ? "Uploading…" : "Change photo"}
          </button>
          <p className="mt-1.5 text-xs text-ink-400">JPG or PNG, up to 5 MB.</p>
          <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png" hidden onChange={onPickAvatar} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Full name</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
        </div>
        <div>
          <label className="label">Address</label>
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional" />
        </div>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary mt-6">
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
