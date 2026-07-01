import { getSession } from "@/lib/session";
import { LogoutButton } from "./LogoutButton";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={session.role === "ADMIN" ? "/dashboard" : "/my-qr"} className="flex items-center gap-2">
              <Logo className="text-lg" />
              <span className="text-sm font-semibold text-foreground">QR 입장 관리</span>
            </Link>
            {session.role === "ADMIN" && (
              <>
                <span className="h-5 w-px bg-border" aria-hidden />
                <div className="flex items-center gap-1">
                  <NavTab href="/dashboard">대시보드</NavTab>
                  <NavTab href="/scanner">스캐너</NavTab>
                  <NavTab href="/mobile">모바일</NavTab>
                </div>
              </>
            )}
            {session.role === "PARENT" && (
              <>
                <span className="h-5 w-px bg-border" aria-hidden />
                <div className="flex items-center gap-1">
                  <NavTab href="/my-qr">내 QR</NavTab>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{session.name}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                session.role === "ADMIN"
                  ? "bg-accent text-primary/90"
                  : "bg-success/15 text-success/90"
              }`}
            >
              {session.role === "ADMIN" ? "관리자" : "학부모"}
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
      className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
    >
      {children}
    </Link>
  );
}
