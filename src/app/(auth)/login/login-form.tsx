"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { ArrowRightIcon, EyeIcon, EyeOffIcon, LockIcon, Loader2Icon, MailIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form/field";
import { loginSchema } from "@/lib/validation/schemas";
import { login } from "../actions";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const form = useForm<z.input<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      setError(null);
      const res = await login(values);
      if (!res.ok) return setError(res.error);
      router.replace(next);
      router.refresh();
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="mt-7 grid gap-4">
      {error && (
        <div role="alert" className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border px-3 py-2 text-sm">
          {error}
        </div>
      )}
      <Field id="email" label="Email" error={errors.email?.message}>
        <div className="relative">
          <MailIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="you@college.edu"
            className="h-11 rounded-xl pl-9"
            {...form.register("email")}
          />
        </div>
      </Field>
      <Field id="password" label="Password" error={errors.password?.message}>
        <div className="relative">
          <LockIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type={show ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className="h-11 rounded-xl px-9"
            {...form.register("password")}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
          >
            {show ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>
      </Field>
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="group mt-2 h-11 rounded-xl border-0 bg-linear-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30 hover:opacity-95"
      >
        {pending ? <Loader2Icon className="animate-spin" /> : null}
        Sign in
        {!pending && <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />}
      </Button>
      <p className="text-muted-foreground text-center text-xs">Forgot your password? Ask an admin to reset it.</p>
      <p className="border-t pt-4 text-center text-sm">
        New here?{" "}
        <a href="/join" className="font-medium text-violet-600 hover:underline dark:text-violet-300">
          Become a member →
        </a>
      </p>
    </form>
  );
}
