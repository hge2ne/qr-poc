"use client";

import { logout } from "@/actions/auth";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="text-sm text-muted-foreground hover:text-muted-foreground transition-colors"
      >
        로그아웃
      </button>
    </form>
  );
}
