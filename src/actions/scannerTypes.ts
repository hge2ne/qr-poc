export type ScannerLookupReservation = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  campus: string;
  round: string | null;
  location: string;
  attendeeCount: number;
  attendeeStatus: "PENDING" | "ENTERED" | "CANCELLED" | null;
  enteredAt: string | null;
};

export type ScannerLookupStudent = {
  key: string;
  studentId: string | null;
  name: string;
  phone: string;
  school: string;
  grade: string;
  className: string | null;
  reservations: ScannerLookupReservation[];
};

export type ScannerEntryEvent = {
  id: string;
  title: string;
  date: string;
  campus: string;
  round: string | null;
  location: string;
};

export type ScannerEntryResult = {
  attendeeName: string;
  phone: string;
  eventTitle: string;
  enteredAt: string;
  alreadyEntered: boolean;
};
