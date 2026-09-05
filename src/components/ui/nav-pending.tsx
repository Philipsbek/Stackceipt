"use client";

import * as React from "react";
import { useLinkStatus } from "next/link";
import { withSpinner } from "./with-spinner";

/**
 * Wraps a link button's content and swaps its icon for a spinner while the
 * navigation is in flight. Must be a descendant of a next/link Link — the
 * Button component wraps link-based buttons in it automatically.
 */
export function NavPendingContent({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return <>{pending ? withSpinner(children) : children}</>;
}
