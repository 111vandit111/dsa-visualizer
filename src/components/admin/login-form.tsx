"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, adminLogin } from "@/lib/api/client";

const HTTP_TOO_MANY_REQUESTS = 429;
const RATE_LIMITED_MESSAGE = "Too many attempts. Please wait a minute and try again.";
const EMPTY_PASSWORD_MESSAGE = "Enter the admin password.";
const WRONG_PASSWORD_MESSAGE = "Incorrect password.";

function describeLoginError(error: unknown): string {
  if (!(error instanceof ApiError)) return "Could not log in. Please try again.";
  if (error.status === HTTP_TOO_MANY_REQUESTS) return RATE_LIMITED_MESSAGE;
  if (error.status === 401) return WRONG_PASSWORD_MESSAGE;
  return error.message;
}

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length === 0) {
      setErrorMessage(EMPTY_PASSWORD_MESSAGE);
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await adminLogin(password);
      setPassword("");
      router.replace("/admin");
      router.refresh();
    } catch (error) {
      setErrorMessage(describeLoginError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-display text-2xl">Admin login</CardTitle>
        <CardDescription>Enter the admin password to manage questions.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              data-testid="admin-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={errorMessage !== null}
              aria-describedby={errorMessage ? "admin-login-error" : undefined}
            />
            {errorMessage ? (
              <p
                id="admin-login-error"
                data-testid="admin-login-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {errorMessage}
              </p>
            ) : null}
          </div>
          <Button
            type="submit"
            data-testid="admin-login-submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : null}
            Log in
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
