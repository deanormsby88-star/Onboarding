import Link from "next/link";
import type { CheckIn } from "@prisma/client";
import { STATUS_LABEL } from "@/lib/checkins";
import { formatWeekRange, weekLabel } from "@/lib/weeks";

/** Shared history table for /history and the person view. */
export function CheckInList({ checkIns }: { checkIns: CheckIn[] }) {
  if (checkIns.length === 0) {
    return (
      <p className="mt-4 text-sm text-gray-500">
        No check-ins yet. The first one is created when the week&apos;s
        self-evaluation is opened.
      </p>
    );
  }
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="px-4 py-2.5 font-medium">Week</th>
            <th className="px-4 py-2.5 font-medium">Type</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium" />
          </tr>
        </thead>
        <tbody>
          {checkIns.map((c) => {
            const week = { isoYear: c.isoYear, isoWeek: c.isoWeek };
            return (
              <tr key={c.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2.5 font-medium">
                  {weekLabel(week)}
                  <span className="ml-2 font-normal text-gray-500">
                    {formatWeekRange(week)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-600">
                  {c.type === "WEEKLY"
                    ? "Weekly"
                    : c.type === "PROBATION_REVIEW"
                      ? "Probation review"
                      : "PIP review"}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={
                      c.status === "COMPLETE"
                        ? "text-heya-green"
                        : c.status === "MISSED"
                          ? "text-red-600"
                          : "text-gray-700"
                    }
                  >
                    {STATUS_LABEL[c.status]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Link
                    href={`/check-in/${c.id}`}
                    className="text-heya-blue hover:underline"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
