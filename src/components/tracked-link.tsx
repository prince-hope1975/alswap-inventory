"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";

import { trackStorefrontEvent } from "~/components/analytics-consent";

export function TrackedLink({
  href,
  eventName,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  eventName: "click_call" | "click_whatsapp";
  children: ReactNode;
}) {
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        props.onClick?.(event);
        trackStorefrontEvent(eventName, { link_url: href });
      }}
    >
      {children}
    </a>
  );
}
