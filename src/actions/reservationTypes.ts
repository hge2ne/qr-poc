export type ReservationPath = "enrolled" | "guest";
export type ReservationStatus = "reserved" | "cancelled";

export type ReservationSession = {
  id: string;
  campus: string;
  round: string;
  title: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  reserved: number;
  reservationStatus: "OPEN" | "CLOSED" | "HIDDEN";
  attendeeCountEnabled?: boolean;
  attendeeCountOptions?: number[];
  createdAt?: string;
};

export type ReservationStudent = {
  id: string;
  name: string;
  parentPhone: string;
  school: string;
  grade: string;
  className: string;
};

export type ReservationInput = {
  eventId: string;
  path: ReservationPath;
  name: string;
  phone: string;
  school?: string;
  grade?: string;
  className?: string;
  attendeeCount?: number;
};

export type StoredReservation = {
  id: string;
  session: Pick<ReservationSession, "id" | "campus" | "round" | "title" | "date" | "time" | "location">;
  path: ReservationPath;
  name: string;
  phone: string;
  extra?: string;
  school?: string;
  grade?: string;
  attendeeCount?: number;
  reservationUrl: string;
  qrUrl?: string;
  status: ReservationStatus;
  createdAt: string;
  cancelledAt?: string;
};

export type ReservationMutationData = {
  reservation: StoredReservation;
  session: ReservationSession;
};
