import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const redirectUrl = new URL(`/verify/${encodeURIComponent(token)}`, request.url);
  return NextResponse.redirect(redirectUrl);
}
