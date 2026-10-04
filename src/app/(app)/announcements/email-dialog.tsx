"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CopyIcon, DownloadIcon, Loader2Icon, MailIcon, SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { announcementMailingList } from "./actions";

type List = { subject: string; body: string; emails: string[]; subscribers: number };

/** Most email apps cope with a mailto: link up to roughly this many Bcc addresses. */
const MAILTO_LIMIT = 60;

/** Email a sent announcement to its mailing list: copy as Bcc, open the mail app, or download. */
export function EmailAnnouncementButton({ announcementId }: { announcementId: string }) {
  const [list, setList] = useState<List | null>(null);
  const [pending, startTransition] = useTransition();

  const load = (open: boolean) => {
    if (!open || list) return;
    startTransition(async () => {
      const res = await announcementMailingList({ announcementId });
      if (!res.ok) return void toast.error(res.error);
      setList(res.data);
    });
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied`);
    } catch {
      toast.error("Couldn't copy — select the text and copy it instead.");
    }
  };

  const download = () => {
    if (!list) return;
    const csv = "email\n" + list.emails.join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "mailing-list.csv" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const mailto = list
    ? `mailto:?bcc=${encodeURIComponent(list.emails.join(","))}&subject=${encodeURIComponent(list.subject)}&body=${encodeURIComponent(list.body)}`
    : "";

  return (
    <Dialog onOpenChange={load}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MailIcon /> Email it
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Email this announcement</DialogTitle>
          <DialogDescription>
            One email to everyone it was sent to, with recipients hidden (Bcc). Paste into Gmail or Outlook and send.
          </DialogDescription>
        </DialogHeader>
        {!list ? (
          <p className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
            <Loader2Icon className="size-4 animate-spin" /> {pending ? "Building the mailing list…" : "Loading…"}
          </p>
        ) : (
          <div className="grid gap-4">
            <p className="bg-muted/60 rounded-xl px-4 py-3 text-sm">
              <strong>{list.emails.length}</strong> recipient{list.emails.length === 1 ? "" : "s"}
              {list.subscribers > 0 && <> (including {list.subscribers} mailing-list subscribers from the website)</>}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={() => copy(list.emails.join(", "), "Recipients")}>
                <CopyIcon /> Copy recipients (Bcc)
              </Button>
              <Button variant="outline" onClick={() => copy(`${list.subject}\n\n${list.body}`, "Message")}>
                <CopyIcon /> Copy subject & message
              </Button>
              <Button variant="outline" onClick={download}>
                <DownloadIcon /> Download list (CSV)
              </Button>
              {list.emails.length <= MAILTO_LIMIT ? (
                <Button asChild>
                  <a href={mailto}>
                    <SendIcon /> Open in email app
                  </a>
                </Button>
              ) : (
                <p className="text-muted-foreground self-center text-xs">
                  Long list: copy the recipients into the Bcc field of a new email.
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
