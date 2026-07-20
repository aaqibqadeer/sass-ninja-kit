import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string; code?: string }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  // `token` (custom flow) or `code` (Supabase reset callback).
  const { token, code } = await searchParams;
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <ResetPasswordForm token={token ?? code} />
    </main>
  );
}
