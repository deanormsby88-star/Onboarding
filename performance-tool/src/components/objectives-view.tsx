import type { Prisma } from "@prisma/client";
import {
  addObjectiveNoteAction,
  createObjectiveAction,
  setObjectiveStatusAction,
} from "@/app/objectives/actions";

type ObjectiveWithNotes = Prisma.DevelopmentObjectiveGetPayload<{
  include: {
    notes: { include: { author: { select: { name: true } } } };
  };
}>;

/** Objectives block, shared by /objectives (own) and the person view. */
export function ObjectivesView({
  subjectId,
  objectives,
}: {
  subjectId: string;
  objectives: ObjectiveWithNotes[];
}) {
  return (
    <div className="space-y-4">
      {objectives.length === 0 ? (
        <p className="text-sm text-gray-500">
          No development objectives yet — add the first one below.
        </p>
      ) : null}

      {objectives.map((o) => (
        <div key={o.id} className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">
              {o.title}
              <span
                className={`ml-2 rounded px-1.5 py-0.5 text-xs ${
                  o.status === "ACTIVE"
                    ? "bg-blue-50 text-heya-blue"
                    : o.status === "ACHIEVED"
                      ? "bg-green-50 text-heya-green"
                      : "bg-gray-100 text-gray-500"
                }`}
              >
                {o.status.toLowerCase()}
              </span>
            </p>
            <span className="text-sm text-gray-500">
              {o.targetDate ? `target ${o.targetDate.toISOString().slice(0, 10)}` : ""}
            </span>
          </div>
          {o.detail ? <p className="mt-1 text-sm text-gray-600">{o.detail}</p> : null}

          {o.notes.length > 0 ? (
            <ul className="mt-3 space-y-1 border-l-2 border-gray-100 pl-3 text-sm">
              {o.notes.map((n) => (
                <li key={n.id}>
                  <span className="text-gray-400">
                    {n.createdAt.toISOString().slice(0, 10)} · {n.author.name}:
                  </span>{" "}
                  {n.note}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <form
              action={async (formData: FormData) => {
                "use server";
                await addObjectiveNoteAction(o.id, formData);
              }}
              className="flex grow gap-2"
            >
              <input
                name="note"
                required
                placeholder="Add a progress note…"
                className="grow rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              />
              <button
                type="submit"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Add note
              </button>
            </form>
            {o.status === "ACTIVE" ? (
              <>
                <form
                  action={async () => {
                    "use server";
                    await setObjectiveStatusAction(o.id, "ACHIEVED");
                  }}
                >
                  <button type="submit" className="text-sm text-heya-green hover:underline">
                    Mark achieved
                  </button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await setObjectiveStatusAction(o.id, "DROPPED");
                  }}
                >
                  <button type="submit" className="text-sm text-gray-500 hover:underline">
                    Drop
                  </button>
                </form>
              </>
            ) : null}
          </div>
        </div>
      ))}

      <form
        action={async (formData: FormData) => {
          "use server";
          await createObjectiveAction(subjectId, formData);
        }}
        className="rounded-lg border border-dashed border-gray-300 bg-white p-4"
      >
        <p className="text-sm font-medium">New objective</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            name="title"
            required
            placeholder="Objective"
            className="grow rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            name="targetDate"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            aria-label="Target date"
          />
        </div>
        <textarea
          name="detail"
          rows={2}
          placeholder="What does done look like? (optional)"
          className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="mt-2 rounded-md bg-heya-blue px-3 py-2 text-sm font-medium text-white hover:bg-heya-blue-dark"
        >
          Add objective
        </button>
      </form>
    </div>
  );
}
