import { Suspense } from "react";
import { FlashToast } from "./flash-toast";

export function Flash({ messages }: { messages: Record<string, string> }) {
  return <Suspense fallback={null}><FlashToast messages={messages} /></Suspense>;
}
