import { getSession } from "@/lib/session";
import { LogoutButton } from "./LogoutButton";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  if (session.role === "ADMIN") {
    return (
      <div className="min-h-screen bg-background lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <AdminSidebar session={session} />
        <main className="min-w-0 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-4">
            <Link href="/my-qr" className="flex shrink-0 items-center gap-2">
              <Logo className="text-lg" />
              <span className="whitespace-nowrap text-sm font-semibold text-foreground">
                NPR ERP
              </span>
            </Link>
            <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
              <NavTab href="/my-qr">내 QR</NavTab>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
            <span className="whitespace-nowrap text-sm text-muted-foreground">{session.name}</span>
            <span
              className="whitespace-nowrap text-xs px-2 py-0.5 rounded-full font-medium bg-success/15 text-success/90"
            >
              학부모
            </span>
            <LogoutButton />
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

// 클릭 가능한 내비게이션 탭 (타이틀 텍스트와 구분되는 hover 스타일)
function NavTab({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
    >
      {children}
    </Link>
  );
}
