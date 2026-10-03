/**
 * The organization's hierarchy, from a person's most senior role (lowest
 * rank). Used to group Users and order role holders on Roles & permissions.
 */
export const TIERS = [
  { key: "master", label: "Master Admin", hint: "Full access to everything" },
  { key: "council", label: "Council", hint: "President, Vice President, Treasurer, Secretary" },
  { key: "heads", label: "Heads & managers", hint: "Lead an area: events, volunteers, merch, communications, safety" },
  { key: "committee", label: "Committee", hint: "Committee members and team leads" },
  { key: "volunteers", label: "Volunteers", hint: "Help at events and fundraisers" },
  { key: "members", label: "Members", hint: "Everyone else" },
] as const;
export type TierKey = (typeof TIERS)[number]["key"];

export function tierFor(topRank: number | null, isMasterAdmin: boolean): TierKey {
  if (isMasterAdmin) return "master";
  if (topRank === null) return "members";
  if (topRank <= 40) return "council";
  if (topRank <= 85) return "heads";
  if (topRank <= 94) return "committee";
  if (topRank <= 99) return "volunteers";
  return "members";
}

export const tierOrder = (k: TierKey) => TIERS.findIndex((t) => t.key === k);

/** Sort people by tier, then by their most senior role, then by name. */
export function byHierarchy<T extends { name: string; isMasterAdmin: boolean; topRank: number | null }>(people: T[]) {
  return [...people].sort(
    (a, b) =>
      tierOrder(tierFor(a.topRank, a.isMasterAdmin)) - tierOrder(tierFor(b.topRank, b.isMasterAdmin)) ||
      (a.topRank ?? 999) - (b.topRank ?? 999) ||
      a.name.localeCompare(b.name),
  );
}

/** Council is only the elected office-bearers: custom roles rank at most as heads. */
export const effectiveRank = (r: { rank: number; isSystem: boolean }) => (r.isSystem ? r.rank : Math.max(r.rank, 41));

/** A person's most senior effective rank, or null without roles. */
export const topRankOf = (roles: { role: { rank: number; isSystem: boolean } }[]) =>
  roles.length ? Math.min(...roles.map((x) => effectiveRank(x.role))) : null;
