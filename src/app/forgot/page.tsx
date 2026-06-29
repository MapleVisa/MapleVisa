import AuthLayout from "@/components/AuthLayout";
import ForgotForm from "@/components/ForgotForm";

export default function ForgotPage() {
  return (
    <AuthLayout title="Forgot your password?" subtitle="Enter your email and we'll send you a reset link.">
      <ForgotForm />
    </AuthLayout>
  );
}
