import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/current-user";
import { db } from "@/lib/db";
import { DEFAULT_SCHEDULE, loadSchedule, type Schedule } from "@/lib/notifications";
import { deleteDelegatedConnection, getDelegatedConnection } from "@/lib/mail";
import { AppShell } from "@/components/app-shell";

const RULE_LABEL: Record<string, string> = {
  self_evaluation_open: "Self-evaluation open (employees)",
  self_evaluation_reminder: "Self-evaluation reminder (employees not submitted)",
  manager_awaiting: "Reports awaiting manager evaluation (managers)",
  manager_incomplete_reminder: "Last week incomplete (managers)",
  admin_overdue: "More than a week overdue (admins)",
};

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

async function saveSettings(formData: FormData) {
  "use server";
  await requireAdmin();
  const schedule: Schedule = {};
  for (const key of Object.keys(DEFAULT_SCHEDULE)) {
    schedule[key] = {
      day: String(formData.get(`${key}-day`) ?? DEFAULT_SCHEDULE[key]!.day),
      time: String(formData.get(`${key}-time`) ?? DEFAULT_SCHEDULE[key]!.time),
      enabled: formData.get(`${key}-enabled`) === "on",
    };
  }
  const retention = String(formData.get("retention") ?? "5");
  await db.appSetting.upsert({
    where: { key: "notification_schedule" },
    update: { value: JSON.stringify(schedule) },
    create: { key: "notification_schedule", value: JSON.stringify(schedule) },
  });
  await db.appSetting.upsert({
    where: { key: "retention_years_after_exit" },
    update: { value: retention },
    create: { key: "retention_years_after_exit", value: retention },
  });
  revalidatePath("/admin/settings");
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ mail?: string; mail_error?: string }>;
}) {
  const admin = await requireAdmin();
  const schedule = await loadSchedule();
  const retention = await db.appSetting.findUnique({
    where: { key: "retention_years_after_exit" },
  });
  const mailConnection = await getDelegatedConnection();
  const appOnlyMail = Boolean(process.env.GRAPH_CLIENT_ID && process.env.GRAPH_SENDER);
  const { mail, mail_error } = await searchParams;

  return (
    <AppShell user={admin}>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-gray-600">
        Notification cadence (SAST — the runner fires on the hour) and
        retention. Config, not code: tune it once the tool is live.
      </p>

      <section className="mt-6 max-w-2xl rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Notification mailbox
        </h2>
        {mail === "connected" ? (
          <p className="mt-2 rounded-md bg-green-50 p-2 text-sm text-heya-green">
            Mailbox connected.
          </p>
        ) : null}
        {mail_error ? (
          <p className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-700">
            Connection failed: {mail_error}
          </p>
        ) : null}
        {appOnlyMail ? (
          <p className="mt-2 text-sm text-gray-600">
            Sending via the app-only Graph configuration (
            {process.env.GRAPH_SENDER}). The connected-mailbox fallback below
            is not used while that is configured.
          </p>
        ) : null}
        {mailConnection ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <p>
              Sending as <strong>{mailConnection.email}</strong>
              <span className="text-gray-500">
                {" "}
                — connected by {mailConnection.connectedByName} on{" "}
                {mailConnection.connectedAt.slice(0, 10)}
              </span>
            </p>
            <form
              action={async () => {
                "use server";
                await requireAdmin();
                await deleteDelegatedConnection();
                revalidatePath("/admin/settings");
              }}
            >
              <button type="submit" className="text-gray-500 hover:underline">
                Disconnect
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-2 text-sm text-gray-600">
            <p>
              No mailbox connected — notification emails are currently
              skipped. Connect a mailbox to send them as you (you can switch
              to a neutral shared mailbox later without losing anything).
            </p>
            <a
              href="/api/mail-connect/start"
              className="mt-3 inline-block rounded-md bg-heya-blue px-4 py-2 text-sm font-medium text-white hover:bg-heya-blue-dark"
            >
              Connect mailbox
            </a>
          </div>
        )}
      </section>

      <form action={saveSettings} className="mt-6 max-w-2xl space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Notification schedule
          </h2>
          <div className="mt-3 space-y-3">
            {Object.entries(schedule).map(([key, rule]) => (
              <div
                key={key}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 text-sm last:border-0 last:pb-0"
              >
                <label className="flex min-w-60 items-center gap-2">
                  <input type="checkbox" name={`${key}-enabled`} defaultChecked={rule.enabled} />
                  {RULE_LABEL[key] ?? key}
                </label>
                <span className="flex items-center gap-2">
                  <select
                    name={`${key}-day`}
                    defaultValue={rule.day}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1.5"
                  >
                    {DAYS.map((day) => (
                      <option key={day} value={day}>
                        {day[0]!.toUpperCase() + day.slice(1)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    name={`${key}-time`}
                    defaultValue={rule.time}
                    step={3600}
                    className="rounded-md border border-gray-300 px-2 py-1.5"
                  />
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Blocker-overdue mails to owners run daily at 08:00 and are not
            configurable here.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Retention
          </h2>
          <label className="mt-2 block text-sm">
            Keep performance records for
            <input
              type="number"
              name="retention"
              min={1}
              max={20}
              defaultValue={retention?.value ?? "5"}
              className="mx-2 w-16 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
            years after employment ends (POPIA default: 5).
          </label>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-heya-blue px-4 py-2 text-sm font-medium text-white hover:bg-heya-blue-dark"
        >
          Save settings
        </button>
      </form>
    </AppShell>
  );
}
