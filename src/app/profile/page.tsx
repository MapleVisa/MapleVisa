import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import BackButton from "@/components/BackButton";
import ProfileForm from "@/components/ProfileForm";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, fullName: true, email: true, phone: true, address: true, avatarKey: true },
  });
  if (!me) redirect("/login");

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="mx-auto w-[90%] py-8">
        <BackButton href="/dashboard" />
        <h1 className="text-2xl font-bold text-ink-900">Your profile</h1>
        <p className="mt-1 text-ink-500">
          Update your photo and contact details. Your name and photo appear in the top bar.
        </p>
        <div className="mt-8">
          <ProfileForm
            id={me.id}
            initial={{
              fullName: me.fullName,
              email: me.email,
              phone: me.phone ?? "",
              address: me.address ?? "",
              avatarKey: me.avatarKey,
            }}
          />
        </div>
      </main>
    </div>
  );
}
