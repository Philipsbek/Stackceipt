import * as React from "react";
import { Loader2 } from "lucide-react";

/**
 * Return `children` with its first element child — typically a leading/trailing
 * icon like an arrow or plus — replaced by a spinner. If there is no element
 * child, the spinner is prepended. Used to swap a button's icon for a loading
 * indicator while an action or navigation is in flight.
 */
export function withSpinner(children: React.ReactNode): React.ReactNode {
  const spinner = <Loader2 key="__spinner" className="size-4 animate-spin" aria-hidden />;
  const arr = React.Children.toArray(children);
  const idx = arr.findIndex((c) => React.isValidElement(c));
  if (idx === -1) {
    return (
      <>
        {spinner}
        {children}
      </>
    );
  }
  arr[idx] = spinner;
  return <>{arr}</>;
}
