"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

/**
 * Renders a spinner while the surrounding <Link> navigation is in flight, and
 * nothing at rest. Must be rendered as a descendant of a next/link Link — the
 * Button component injects it automatically into link-based buttons.
 */
export function NavPending() {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null;
}
