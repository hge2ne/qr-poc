import { getScannerEntryEvents } from "@/actions/scanner";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { ScannerClient } from "./ScannerClient";

export default async function ScannerPage() {
  const session = await getSession();
  if (session?.role !== "ADMIN") redirect("/my-qr");

  const events = await getScannerEntryEvents();

  return (
    <ScannerClient
      initialEvents={events.data ?? []}
      initialEventsError={events.success ? undefined : events.error}
    />
  );
}
