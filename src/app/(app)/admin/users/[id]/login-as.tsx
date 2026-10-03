"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, LogInIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { startImpersonation } from "../impersonate";

export function LoginAsButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">
          <LogInIcon /> Log in as {name.split(" ")[0]}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Log in as {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ll see the app exactly as {name.split(" ")[0]} does and can act on their behalf. A banner stays on screen, and
            everything you do is recorded in the audit log under your name. Use “Return to my account” to come back.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const res = await startImpersonation({ userId });
                if (!res.ok) return void toast.error(res.error);
                // Re-render the whole app (layout included) as the other person.
                router.replace("/dashboard");
                router.refresh();
              });
            }}
          >
            {pending && <Loader2Icon className="animate-spin" />}
            Log in as {name.split(" ")[0]}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
