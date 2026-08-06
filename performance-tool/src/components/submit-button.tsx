"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button that disables itself and says what it is doing while the
 * server action runs. Without this a slow save looks like a dead button and
 * people click it again — which, on a check-in, means a double submit.
 *
 * Must be rendered inside the <form> it submits: useFormStatus reads the
 * status of the nearest parent form.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className = "",
  ...rest
}: {
  children: React.ReactNode;
  pendingLabel?: string;
} & Omit<React.ComponentProps<"button">, "type" | "disabled">) {
  const { pending } = useFormStatus();
  return (
    <button
      {...rest}
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {pending ? (
        <>
          <Spinner />
          {pendingLabel ?? "Working…"}
        </>
      ) : (
        children
      )}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}
