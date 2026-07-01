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
          <div className="flex items-center gap-6">
            <Link href={session.role === "ADMIN" ? "/dashboard" : "/my-qr"} className="flex items-center gap-2">
              <Logo className="text-lg" />
              <span className="text-sm font-medium text-muted-foreground">QR 입장 관리</span>
            </Link>
            {session.role === "ADMIN" && (
              <>
                <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  대시보드
                </Link>
                <Link href="/scanner" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  스캐너
                </Link>
                <Link href="/mobile" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  모바일
                </Link>
              </>
            )}
            {session.role === "PARENT" && (
              <Link href="/my-qr" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                내 QR
              </Link>
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
