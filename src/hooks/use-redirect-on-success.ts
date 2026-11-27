"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/lib/types";

/**
 * Navigates once a server action reports success with a target.
 * (Client-side push proved more reliable than redirect() inside form actions.)
 */
export function useRedirectOnSuccess(state: ActionState) {
  const router = useRouter();
  useEffect(() => {
    if (state.ok && state.redirectTo) router.push(state.redirectTo);
  }, [state, router]);
}
