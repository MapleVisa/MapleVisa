import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import AuthLayout from "@/components/AuthLayout";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/i18n";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "APPLICANT" ? "/dashboard" : "/admin");
  const t = await getDictionary();

  return (
    <AuthLayout title={t.auth.createAccount} subtitle={t.auth.signupSubtitle}>
      <AuthForm mode="signup" />
    </AuthLayout>
  );
}
