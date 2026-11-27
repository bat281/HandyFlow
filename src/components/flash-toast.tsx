"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/** Shows a toast for ?param=1 flags set by redirects, then cleans the URL. */
export function FlashToast({ messages }: { messages: Record<string, string> }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    const hit = Object.keys(messages).find((k) => params.has(k));
    if (!hit) return;
    done.current = true;
    toast.success(messages[hit]);
    const next = new URLSearchParams(params);
    Object.keys(messages).forEach((k) => next.delete(k));
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [params, messages, router, pathname]);
  return null;
}
