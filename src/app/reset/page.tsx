import AuthLayout from "@/components/AuthLayout";
import ResetForm from "@/components/ResetForm";

export default function ResetPage({ searchParams }: { searchParams: { token?: string } }) {
  return (
    <AuthLayout title="Choose a new password" subtitle="Enter a new password for your account.">
      <ResetForm token={searchParams.token || ""} />
    </AuthLayout>
  );
}
