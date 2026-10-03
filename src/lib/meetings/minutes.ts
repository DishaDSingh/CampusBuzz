import type { MinutesData } from "@/components/minutes";
import type { Extracted } from "./extract";

/** What a meeting stores after review: actions remember who was picked and whether a task was made. */
export type StoredMinutes = Omit<Extracted, "actions" | "attendees"> & {
  attendees?: string[];
  actions: (Extracted["actions"][number] & { ownerId?: string | null; created?: boolean })[];
};

type MeetingWithTasks = {
  title: string;
  heldAt: Date;
  committee: { name: string } | null;
  createdBy: { name: string } | null;
  tasks: { title: string; status: string; dueAt: Date | null; assignee: { name: string } | null }[];
};

/** Turn a confirmed meeting into the MoM layout; tasks created from it carry the real owner and status. */
export function toMinutes(m: MeetingWithTasks, x: StoredMinutes): MinutesData {
  const created = m.tasks.map((t) => ({ task: t.title, owner: t.assignee?.name ?? null, due: t.dueAt, done: t.status === "DONE" }));
  const notCreated = x.actions
    .filter((a) => a.created === false)
    .map((a) => ({ task: a.task, owner: a.owner, due: a.due ? new Date(a.due) : null }));
  return {
    title: m.title,
    heldAt: m.heldAt,
    committee: m.committee?.name,
    recordedBy: m.createdBy?.name,
    summary: x.summary,
    attendees: x.attendees ?? [],
    decisions: x.decisions,
    questions: x.questions,
    actions: [...created, ...notCreated],
  };
}
