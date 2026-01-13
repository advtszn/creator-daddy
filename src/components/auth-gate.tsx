"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { verifyPassphrase } from "~/app/actions/auth";

const AUTH_STORAGE_KEY = "creator-daddy-auth";
const IS_DEV = process.env.NODE_ENV === "development";

export function AuthGate({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(
    IS_DEV ? true : null
  );
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Skip auth check in development
    if (IS_DEV) return;

    const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(stored === "true");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const isValid = await verifyPassphrase(passphrase);
      if (isValid) {
        sessionStorage.setItem(AUTH_STORAGE_KEY, "true");
        setIsAuthenticated(true);
      } else {
        setError("Invalid passphrase");
        setPassphrase("");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while checking session storage
  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Auth screen
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">+_+ Creator Daddy</h1>
            <p className="text-muted-foreground">
              Enter the passphrase to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                disabled={isLoading}
                autoFocus
                className="h-12 text-center text-lg"
              />
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12"
              disabled={isLoading || !passphrase}
            >
              {isLoading ? "Verifying..." : "Enter"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated - render children
  return <>{children}</>;
}
