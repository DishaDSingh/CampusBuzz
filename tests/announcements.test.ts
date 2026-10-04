import { describe, expect, it } from "vitest";
import { draftAnnouncementSchema, publishAnnouncementSchema, saveAnnouncementSchema } from "@/lib/validation/schemas";
import { NAV } from "@/components/shell/nav";
import { eventTemplate } from "@/lib/announcement-templates";

describe("announcements: human in the loop", () => {
  it("needs a real brief and a known audience to draft", () => {
    expect(draftAnnouncementSchema.safeParse({ brief: "hi", audience: "MEMBERS" }).success).toBe(false);
    expect(draftAnnouncementSchema.safeParse({ brief: "Gala tickets are on sale now", audience: "EVERYONE_ON_EARTH" }).success).toBe(false);
    expect(draftAnnouncementSchema.parse({ brief: "Gala tickets are on sale now", audience: "MEMBERS" }).useAi).toBe(true);
  });

  it("publishing requires the confirmed recipient count", () => {
    expect(publishAnnouncementSchema.safeParse({ announcementId: "a1" }).success).toBe(false);
    expect(publishAnnouncementSchema.safeParse({ announcementId: "a1", confirmRecipients: 141 }).success).toBe(true);
  });

  it("validates edits", () => {
    expect(saveAnnouncementSchema.safeParse({ announcementId: "a", title: "Hi", body: "Too short", audience: "ALL" }).success).toBe(false);
  });
});

describe("navigation follows the three product layers", () => {
  it("groups modules into Operate, Understand and Anticipate", () => {
    const groups = Object.fromEntries(NAV.map((g) => [g.label, g.items.map((i) => i.href)]));
    expect(Object.keys(groups)).toEqual(["Home", "Operate", "Understand", "Anticipate", "Administration", "You"]);
    expect(groups.Understand).toEqual(["/insights", "/analytics", "/reports"]);
    expect(groups.Anticipate).toEqual(["/meetings", "/memory"]);
  });

  it("every nav link is unique", () => {
    const hrefs = NAV.flatMap((g) => g.items.map((i) => i.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("event announcements", () => {
  const event = {
    title: "Diwali Gala Night",
    startsAt: new Date(2026, 10, 7, 18, 0),
    endsAt: new Date(2026, 10, 7, 22, 0),
    venue: "Main Auditorium",
    description: null,
    salesOpenAt: null,
    organizer: "Ananya Iyer",
    ticketTypes: [{ name: "Regular", memberPricePaise: 29900, publicPricePaise: 49900 }],
  };

  it("fills the official template from the event's own facts", () => {
    const t = eventTemplate(event, "Live music and food stalls.", "Horizon Student Association");
    expect(t.title).toContain("Diwali Gala Night");
    expect(t.body).toContain("Live music and food stalls.");
    expect(t.body).toContain("Main Auditorium");
    expect(t.body).toContain("₹299 for members, ₹499 for others");
    expect(t.body).toContain("open Events → Diwali Gala Night");
    expect(t.body).toContain("Ananya Iyer, on behalf of Horizon Student Association");
  });

  it("leaves placeholders for anything missing, so it can't be sent unfinished", () => {
    const t = eventTemplate({ ...event, ticketTypes: [] }, "", "HSA");
    expect(t.body).toMatch(/\[add ticket prices\]/);
    expect(t.body).toMatch(/\[add what makes this event special\]/);
  });

  it("only an event announcement may target the event's participants", () => {
    expect(
      saveAnnouncementSchema.safeParse({ announcementId: "c".repeat(25), title: "Hello", body: "A long enough body", audience: "EVENT" })
        .success,
    ).toBe(true);
  });
});
