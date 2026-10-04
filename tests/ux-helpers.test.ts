import { describe, expect, it } from "vitest";
import { byHierarchy, effectiveRank, tierFor, topRankOf } from "@/lib/rbac/hierarchy";
import { parseMerchPrompt } from "@/lib/merch/prompt";
import { summarizeReport } from "@/lib/reports/types";
import { routeOffline } from "@/lib/copilot/router";
import { AUDIENCE_KEYS, suggestedTemplate, templates } from "@/lib/announcement-templates";

describe("hierarchy", () => {
  it("puts the Master Admin, then council, heads, committee, volunteers, members", () => {
    expect(tierFor(null, true)).toBe("master");
    expect(tierFor(10, false)).toBe("council");
    expect(tierFor(40, false)).toBe("council");
    expect(tierFor(50, false)).toBe("heads");
    expect(tierFor(85, false)).toBe("heads");
    expect(tierFor(90, false)).toBe("committee");
    expect(tierFor(95, false)).toBe("volunteers");
    expect(tierFor(100, false)).toBe("members");
    expect(tierFor(null, false)).toBe("members");
  });

  it("never puts a custom role on the council", () => {
    expect(effectiveRank({ rank: 35, isSystem: false })).toBe(41);
    expect(tierFor(topRankOf([{ role: { rank: 35, isSystem: false } }]), false)).toBe("heads");
    expect(topRankOf([{ role: { rank: 100, isSystem: true } }, { role: { rank: 30, isSystem: true } }])).toBe(30);
  });

  it("sorts by tier, then seniority, then name", () => {
    const sorted = byHierarchy([
      { name: "Zed", isMasterAdmin: false, topRank: 100 },
      { name: "Bea", isMasterAdmin: false, topRank: 10 },
      { name: "Al", isMasterAdmin: false, topRank: 30 },
      { name: "Root", isMasterAdmin: true, topRank: null },
      { name: "Abe", isMasterAdmin: false, topRank: 100 },
    ]);
    expect(sorted.map((p) => p.name)).toEqual(["Root", "Bea", "Al", "Abe", "Zed"]);
  });
});

describe("merch prompt", () => {
  it("reads product, colour and event from one line", () => {
    const p = parseMerchPrompt("Classic navy hoodie for Diwali Gala 2026");
    expect(p.productType).toBe("hoodie");
    expect(p.baseColor).toBe("#1e3a8a");
    expect(p.title?.toLowerCase()).toContain("diwali");
  });
});

describe("report summary", () => {
  it("leads with the first sentence and keeps numeric points", () => {
    const s = summarizeReport([
      { heading: "Summary", body: "A strong month. Membership grew to 240. Revenue was ₹52,000." },
      { heading: "Events", body: "- 3 events held\n- Great vibes" },
    ]);
    expect(s.headline).toBe("A strong month.");
    expect(s.points.some((p) => p.includes("240"))).toBe(true);
    expect(s.points.some((p) => p.includes("3 events"))).toBe(true);
    expect(s.points.length).toBeLessThanOrEqual(5);
  });
});

describe("announcement templates", () => {
  it("suggests a template for every audience", () => {
    const keys = new Set(templates("Horizon").map((t) => t.key));
    for (const a of AUDIENCE_KEYS) expect(keys.has(suggestedTemplate[a])).toBe(true);
  });
  it("fee reminders go to members whose membership ends today", () => {
    const t = templates("Horizon").find((x) => x.key === suggestedTemplate.TODAY)!;
    expect(t.body.toLowerCase()).toContain("fee");
  });
});

describe("assistant routing (offline)", () => {
  it.each([
    ["Is my membership active?", "my_membership"],
    ["When are my fees due?", "my_membership"],
    ["How do I renew my membership?", "my_membership"],
    ["Which tickets do I have?", "my_tickets"],
    ["What's the status of my merch orders?", "my_orders"],
    ["What can I do here?", "my_access"],
    ["Where do I find the calendar?", "navigate"],
    ["What needs my attention today?", "attention"],
    ["How much came in this month?", "finance_summary"],
  ])("%s → %s", (q, intent) => {
    expect(routeOffline(q).intent).toBe(intent);
  });
});
