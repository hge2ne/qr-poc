import { getSession } from "@/lib/session";
import { LogoutButton } from "./LogoutButton";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href={session.role === "ADMIN" ? "/dashboard" : "/my-qr"} className="flex items-center gap-2">
              <Logo className="text-lg" />
              <span className="text-sm font-medium text-gray-600">QR 입장 관리</span>
            </Link>
            {session.role === "ADMIN" && (
              <>
                <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  대시보드
                </Link>
                <Link href="/scanner" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  스캐너
                </Link>
                <Link href="/mobile" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  모바일
                </Link>
              </>
            )}
            {session.role === "PARENT" && (
              <Link href="/my-qr" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                내 QR
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{session.name}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                session.role === "ADMIN"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-green-100 text-green-700"
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
