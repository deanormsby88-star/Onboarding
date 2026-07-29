import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/current-user";
import { db } from "@/lib/db";
import { DEFAULT_SCHEDULE, loadSchedule, type Schedule } from "@/lib/notifications";
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

export default async function SettingsPage() {
  const admin = await requireAdmin();
  const schedule = await loadSchedule();
  const retention = await db.appSetting.findUnique({
    where: { key: "retention_years_after_exit" },
  });

  return (
    <AppShell user={admin}>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-gray-600">
        Notification cadence (SAST — the runner fires on the hour) and
        retention. Config, not code: tune it once the tool is live.
      </p>

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
