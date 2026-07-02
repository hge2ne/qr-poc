import { SolapiMessageService } from "solapi";
import { normalizePhoneNumber } from "@/lib/phone";
import { toShortQrUrl, toShortReservationUrl } from "@/lib/appUrls";

export type SmsSendStatus = "sent" | "skipped" | "failed";

export type SmsSendResult = {
  status: SmsSendStatus;
  messageId?: string;
  error?: string;
};

type SolapiConfig = {
  apiKey: string;
  apiSecret: string;
  sender: string;
};

type ReservationSmsInput = {
  to: string;
  studentName: string;
  eventTitle: string;
  eventDateText: string;
  location: string;
  reservationUrl?: string;
  qrUrl?: string;
};

type EntrySmsInput = {
  to: string;
  attendeeName: string;
  eventTitle: string;
  enteredAt: Date;
};

const SMS_EVENT_BRAND = "늘푸른 수학원 설명회";
const TRUTHY_ENV_VALUES = new Set(["1", "true", "yes", "y", "on"]);
const FALSY_ENV_VALUES = new Set(["0", "false", "no", "n", "off"]);

type CachedSolapiClient = {
  cacheKey: string;
  client: SolapiMessageService;
};

let cachedSolapiClient: CachedSolapiClient | null = null;

function parseOptionalBoolean(value: string | undefined): boolean | null {
  if (value === undefined) return null;
  const normalized = value.trim().toLowerCase();
  if (TRUTHY_ENV_VALUES.has(normalized)) return true;
  if (FALSY_ENV_VALUES.has(normalized)) return false;
  return null;
}

function parseBoolean(value: string | undefined): boolean {
  return parseOptionalBoolean(value) === true;
}

function cleanEnvValue(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  const quote = trimmed[0];
  if (
    trimmed.length >= 2 &&
    (quote === `"` || quote === "'") &&
    trimmed[trimmed.length - 1] === quote
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function isProductionDeployment(): boolean {
  return process.env.VERCEL_ENV === "production" || (
    process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV
  );
}

function isSmsEnabled(): boolean {
  if (parseBoolean(process.env.SMS_DISABLED)) return false;

  const explicitEnabled = parseOptionalBoolean(process.env.SMS_ENABLED);
  if (explicitEnabled !== null) return explicitEnabled;

  return isProductionDeployment();
}

function shouldRestrictToTestRecipients(): boolean {
  const explicitRestriction = parseOptionalBoolean(
    process.env.SMS_RECIPIENT_ALLOWLIST_ENABLED ?? process.env.SMS_TEST_RECIPIENTS_ENABLED,
  );
  if (explicitRestriction !== null) return explicitRestriction;

  return !isProductionDeployment();
}

function getSolapiConfig(): SolapiConfig | null {
  if (!isSmsEnabled()) {
    return null;
  }

  const apiKey = cleanEnvValue(process.env.SOLAPI_API_KEY);
  const apiSecret = cleanEnvValue(process.env.SOLAPI_API_SECRET);
  const sender = toSolapiPhoneNumber(cleanEnvValue(process.env.SOLAPI_SENDER));

  if (!apiKey || !apiSecret || !sender) return null;

  return {
    apiKey,
    apiSecret,
    sender,
  };
}

function getSolapiClient(config: SolapiConfig): SolapiMessageService {
  const cacheKey = `${config.apiKey}:${config.apiSecret}`;
  if (!cachedSolapiClient || cachedSolapiClient.cacheKey !== cacheKey) {
    cachedSolapiClient = {
      cacheKey,
      client: new SolapiMessageService(config.apiKey, config.apiSecret),
    };
  }
  return cachedSolapiClient.client;
}

function toSolapiPhoneNumber(phone: string): string {
  const digits = normalizePhoneNumber(phone);
  if (digits.startsWith("82") && digits.length > 10) return `0${digits.slice(2)}`;
  return digits;
}

function getTestRecipientSet(): Set<string> | null {
  if (!shouldRestrictToTestRecipients()) return null;

  const rawRecipients = process.env.SMS_RECIPIENT_ALLOWLIST ?? process.env.SMS_TEST_RECIPIENTS;
  const recipients = rawRecipients?.split(",")
    .map((phone) => toSolapiPhoneNumber(phone))
    .filter(Boolean);

  return recipients?.length ? new Set(recipients) : null;
}

function getBlockedByTestRecipientError(recipient: string): string | null {
  const testRecipients = getTestRecipientSet();
  if (!testRecipients || testRecipients.has(recipient)) return null;
  return "Recipient is not included in the SMS recipient allowlist.";
}

function formatKoreanDateTime(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getSolapiMessageId(response: unknown): string | undefined {
  if (!response || typeof response !== "object") return undefined;

  const data = response as {
    groupId?: unknown;
    messageId?: unknown;
    message?: { messageId?: unknown };
  };
  if (typeof data.messageId === "string") return data.messageId;
  if (typeof data.groupId === "string") return data.groupId;
  if (typeof data.message?.messageId === "string") return data.message.messageId;
  return undefined;
}

async function sendSms(to: string, body: string): Promise<SmsSendResult> {
  const config = getSolapiConfig();
  if (!config) {
    return { status: "skipped", error: "SMS provider is not enabled or configured." };
  }

  const recipient = toSolapiPhoneNumber(to);
  if (recipient.length < 9) {
    return { status: "failed", error: "Invalid recipient phone number." };
  }

  const testRecipientError = getBlockedByTestRecipientError(recipient);
  if (testRecipientError) {
    console.warn(`[sms] SOLAPI send skipped: ${testRecipientError} recipient=${recipient}`);
    return { status: "skipped", error: testRecipientError };
  }

  try {
    const client = getSolapiClient(config);
    const response = await client.send({
      to: recipient,
      from: config.sender,
      text: body,
      autoTypeDetect: true,
    });

    return { status: "sent", messageId: getSolapiMessageId(response) };
  } catch (error) {
    console.error("[sms] SOLAPI send failed:", error);
    return { status: "failed", error: "SMS provider request failed." };
  }
}

export async function sendReservationSuccessSms(
  input: ReservationSmsInput,
): Promise<SmsSendResult> {
  const reservationUrl = input.reservationUrl
    ? toShortReservationUrl(input.reservationUrl)
    : undefined;
  const qrUrl = input.qrUrl ? toShortQrUrl(input.qrUrl) : undefined;
  const body = [
    `[${SMS_EVENT_BRAND} 예약 완료]`,
    `${input.studentName} 학생 예약이 완료되었습니다.`,
    `설명회: ${input.eventTitle}`,
    `설명회 일시: ${input.eventDateText}`,
    `장소: ${input.location}`,
    reservationUrl ? `예약 확인 URL` : undefined,
    reservationUrl,
    qrUrl ? `입장 QR URL` : undefined,
    qrUrl,
    `설명회 당일 입장 시 입장 QR 링크를 제시해 주세요.`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendSms(input.to, body);
}

export async function sendEntryConfirmedSms(input: EntrySmsInput): Promise<SmsSendResult> {
  const body = [
    `[${SMS_EVENT_BRAND} 입장 확인]`,
    `${input.attendeeName}님 입장 처리되었습니다.`,
    `설명회: ${input.eventTitle}`,
    `입장 시간: ${formatKoreanDateTime(input.enteredAt)}`,
    `감사합니다.`,
  ].join("\n");

  return sendSms(input.to, body);
}
