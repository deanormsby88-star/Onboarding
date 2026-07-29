export default function NoAccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold">No access</h1>
        <p className="mt-3 text-sm text-gray-600">
          Your Microsoft account signed in, but there is no Heya Performance
          profile set up for it. Access is added by an administrator — ask
          Dean or HR to set you up, then sign in again.
        </p>
        <a
          href="/signin"
          className="mt-6 inline-block text-sm font-medium text-heya-blue hover:underline"
        >
          Back to sign in
        </a>
      </div>
    </main>
  );
}
