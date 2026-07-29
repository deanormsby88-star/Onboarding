import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { getCurrentUser } from "@/lib/current-user";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Heya Performance</h1>
        <p className="mt-2 text-sm text-gray-600">
          Weekly check-ins for the Heya team. Sign in with your Heya Microsoft
          account.
        </p>
        {error ? (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            Sign-in didn&apos;t complete. Try again, and if it keeps failing
            contact IT.
          </p>
        ) : null}
        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="mt-6 w-full rounded-lg bg-heya-blue px-4 py-2.5 font-medium text-white hover:bg-heya-blue-dark focus:outline-2 focus:outline-offset-2 focus:outline-heya-blue"
          >
            Sign in with Microsoft
          </button>
        </form>
      </div>
    </main>
  );
}
