"use client";

import { Logo } from "@/components/Logo";
import type { SessionData } from "@/lib/session";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./LogoutButton";

const NAV_ITEMS = [
  { label: "명단", disabled: true },
  { label: "전화예약/취소", href: "/phone-reservations", prefixes: ["/phone-reservations"] },
  { label: "문자", disabled: true },
  { label: "QR 운영", href: "/dashboard", prefixes: ["/dashboard", "/events"] },
  { label: "태블릿 QR", href: "/scanner", prefixes: ["/scanner"] },
  { label: "모바일뷰", href: "/mobile", prefixes: ["/mobile"] },
] as const;

export function AdminSidebar({ session }: { session: SessionData }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-20 flex bg-card border-b border-border lg:h-screen lg:flex-col lg:border-b-0 lg:border-r">
      <div className="flex w-full flex-col lg:h-full lg:min-h-0">
        <div className="flex items-center justify-between gap-3 px-4 py-4 lg:px-5">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
            <Logo className="text-xl" />
            <span className="whitespace-nowrap text-base font-bold text-foreground">
              ERP
            </span>
          </Link>
          <span className="hidden rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-primary lg:inline-flex">
            관리자
          </span>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-0">
          {NAV_ITEMS.map((item) => {
            if (!("href" in item)) {
              return (
                <button
                  key={item.label}
                  type="button"
                  disabled
                  className="whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground/60"
                >
                  {item.label}
                </button>
              );
            }

            const active = item.prefixes.some(
              (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
            );

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-accent text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto hidden min-h-32 border-t border-border p-6 lg:block">
          <p className="truncate text-sm font-semibold text-foreground">{session.name}</p>
          <div className="mt-4 flex items-center justify-between gap-4">
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-primary">
              관리자
            </span>
            <LogoutButton />
          </div>
        </div>
      </div>
    </aside>
  );
}
