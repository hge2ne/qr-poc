"use client";

import { logout } from "@/actions/auth";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        로그아웃
      </button>
    </form>
  );
}
