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

type SolapiMessageReceipt = {
  messageId?: unknown;
  to?: unknown;
  from?: unknown;
  statusCode?: unknown;
  statusMessage?: unknown;
};

type SolapiSendResponse = {
  failedMessageList?: unknown;
  messageList?: unknown;
  groupId?: unknown;
  groupInfo?: {
    groupId?: unknown;
    count?: {
      total?: unknown;
      registeredFailed?: unknown;
      registeredSuccess?: unknown;
    };
  };
};

type SolapiSendError = {
  errorCode?: unknown;
  errorMessage?: unknown;
  message?: unknown;
  failedMessageList?: unknown;
  validationErrors?: unknown;
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

function maskPhoneNumber(phone: string): string {
  const digits = normalizePhoneNumber(phone);
  if (digits.length < 7) return "(invalid)";
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
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

  const data = response as SolapiSendResponse & {
    messageId?: unknown;
    message?: { messageId?: unknown };
  };
  if (typeof data.messageId === "string") return data.messageId;
  if (typeof data.groupId === "string") return data.groupId;
  if (typeof data.groupInfo?.groupId === "string") return data.groupInfo.groupId;
  if (typeof data.message?.messageId === "string") return data.message.messageId;
  const [messageReceipt] = getSolapiReceipts(data.messageList);
  if (typeof messageReceipt?.messageId === "string") return messageReceipt.messageId;
  return undefined;
}

function getSolapiReceipts(value: unknown): SolapiMessageReceipt[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is SolapiMessageReceipt => (
    Boolean(item) && typeof item === "object"
  ));
}

function getSolapiStatusMessage(receipt: SolapiMessageReceipt): string {
  const statusCode = typeof receipt.statusCode === "string" ? receipt.statusCode : "";
  const statusMessage = typeof receipt.statusMessage === "string" ? receipt.statusMessage : "";
  return [statusCode, statusMessage].filter(Boolean).join(" ");
}

function getSolapiResponseFailure(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;

  const data = response as SolapiSendResponse;
  const [failedReceipt] = getSolapiReceipts(data.failedMessageList);
  if (failedReceipt) {
    return getSolapiStatusMessage(failedReceipt) || "SOLAPI rejected the message.";
  }

  const total = Number(data.groupInfo?.count?.total ?? 0);
  const registeredSuccess = Number(data.groupInfo?.count?.registeredSuccess ?? 0);
  const registeredFailed = Number(data.groupInfo?.count?.registeredFailed ?? 0);
  if (total > 0 && registeredSuccess === 0 && registeredFailed > 0) {
    const [messageReceipt] = getSolapiReceipts(data.messageList);
    return messageReceipt
      ? getSolapiStatusMessage(messageReceipt) || "SOLAPI rejected the message."
      : "SOLAPI rejected the message.";
  }

  return null;
}

function getSolapiErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return error instanceof Error ? error.message : "SMS provider request failed.";
  }

  const data = error as SolapiSendError;
  const [failedReceipt] = getSolapiReceipts(data.failedMessageList);
  if (failedReceipt) {
    return getSolapiStatusMessage(failedReceipt) || "SOLAPI rejected the message.";
  }

  const errorCode = typeof data.errorCode === "string" ? data.errorCode : "";
  const errorMessage = typeof data.errorMessage === "string"
    ? data.errorMessage
    : typeof data.message === "string"
      ? data.message
      : "";
  const validationErrors = Array.isArray(data.validationErrors)
    ? data.validationErrors.filter((value): value is string => typeof value === "string")
    : [];

  return [
    [errorCode, errorMessage].filter(Boolean).join(" "),
    validationErrors.join(", "),
  ].filter(Boolean).join(" / ") || "SMS provider request failed.";
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
    console.warn(`[sms] SOLAPI send skipped: ${testRecipientError} recipient=${maskPhoneNumber(recipient)}`);
    return { status: "skipped", error: testRecipientError };
  }

  try {
    const client = getSolapiClient(config);
    const response = await client.send({
      to: recipient,
      from: config.sender,
      text: body,
      autoTypeDetect: true,
    }, {
      showMessageList: true,
    });

    const responseFailure = getSolapiResponseFailure(response);
    if (responseFailure) {
      console.error(
        `[sms] SOLAPI send rejected: recipient=${maskPhoneNumber(recipient)} reason=${responseFailure}`,
      );
      return { status: "failed", error: responseFailure };
    }

    return { status: "sent", messageId: getSolapiMessageId(response) };
  } catch (error) {
    const providerError = getSolapiErrorMessage(error);
    console.error(
      `[sms] SOLAPI send failed: recipient=${maskPhoneNumber(recipient)} reason=${providerError}`,
      error,
    );
    return { status: "failed", error: providerError };
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
