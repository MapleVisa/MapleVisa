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
    </AuthLayout>
  );
}
