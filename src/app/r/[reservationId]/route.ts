import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reservationId: string }> },
) {
  const { reservationId } = await params;
  const redirectUrl = new URL(`/reserve/${encodeURIComponent(reservationId)}`, request.url);
  return NextResponse.redirect(redirectUrl);
}
