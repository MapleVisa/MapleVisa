import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import AuthLayout from "@/components/AuthLayout";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/i18n";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "APPLICANT" ? "/dashboard" : "/admin");
  const t = await getDictionary();

  return (
    <AuthLayout title={t.auth.welcomeBack} subtitle={t.auth.loginSubtitle}>
      <AuthForm mode="login" />
      <div className="mt-8 rounded-xl border border-ink-200 bg-ink-50 p-4 text-xs text-ink-500">
        <p className="font-semibold text-ink-600">{t.auth.demoAccounts}</p>
        <p className="mt-1">applicant@maplevisa.test / applicant1234</p>
        <p>admin@maplevisa.test / admin1234</p>
        <p>lawyer@maplevisa.test / lawyer1234</p>
      </div>
    </AuthLayout>
  );
}
