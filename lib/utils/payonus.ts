import crypto from "crypto";

// ─── PayOnUs Utility ──────────────────────────────────────────────────────────
// Sandbox base URL: https://core-sandbox.payonus.com
// Auth: OAuth 2.0 — token cached for ~24hrs (expires_in: 86399s)
// Used for: wallet top-up (virtual account), creator payouts

const PAYONUS_BASE_URL = process.env.PAYONUS_BASE_URL!;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PayOnUsCustomer {
  name: string;
  email: string;
  phone: string;
  externalId?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    countryCode?: string;
  };
  nin?: string;
  bvn?: string;
}

export interface PayOnUsDynamicAccountRequest {
  amount: number;
  reference: string;
  customer: PayOnUsCustomer;
}

export interface PayOnUsDynamicAccountResponse {
  accountName: string;
  accountNumber: string;
  bankName: string;
  amount: number;
  onusReference: string;
  merchantReference: string;
}

export interface PayOnUsWebhookPayload {
  id: string;
  type: "COLLECTION" | "PAYOUT";
  currency: string;
  sessionId: string | null;
  businessId: string;
  merchantFee: number;
  accountNumber: string;
  onusReference: string;
  paymentStatus: "SUCCESSFUL" | "FAILED" | "PENDING";
  paymentChannel: string;
  merchantReference: string;
  providerReference: string | null;
  transactionAmount: number;
  merchantCheckoutReference: string | null;
}

// ─── Token Cache ──────────────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getAccessToken(): Promise<string> {
  const now = Date.now();

  if (false && cachedToken && now < tokenExpiresAt - 60_000) {
    return cachedToken!;
  }

  console.log("[PayOnUs] Fetching new access token...");

  const res = await fetch(`${PAYONUS_BASE_URL}/api/v1/access-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiClientId: process.env.PAYONUS_CLIENT_ID!,
      apiClientSecret: process.env.PAYONUS_CLIENT_SECRET!,
    }),
  });

  const rawTokenText = await res.text();
  console.log("[PayOnUs] Token response status:", res.status);
  console.log("[PayOnUs] Token response body:", rawTokenText);

  let data: Record<string, unknown>;
  try { data = JSON.parse(rawTokenText); }
  catch { throw new Error("PayOnUs: Failed to parse token response"); }

  const tokenData = (data.data ?? data) as Record<string, unknown>;

  if (!res.ok || !tokenData.access_token) {
    throw new Error((data.message as string) || "PayOnUs: Failed to get access token");
  }

  cachedToken = tokenData.access_token as string;
  tokenExpiresAt = now + ((tokenData.expires_in as number) ?? 86399) * 1000;
  console.log("[PayOnUs] Token obtained:", (cachedToken as string).slice(0, 30) + "...");

  return cachedToken!;
}

// ─── Base Fetcher ─────────────────────────────────────────────────────────────

async function payonusFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  const res = await fetch(`${PAYONUS_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const text = await res.text();

  if (!text) {
    throw new Error("PayOnUs API returned empty response — status: " + res.status);
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("[PayOnUs] Failed to parse response:", text);
    throw new Error("PayOnUs API returned invalid JSON — status: " + res.status);
  }

  if (!res.ok) {
    console.error("[PayOnUs] Error response:", res.status, JSON.stringify(data, null, 2));
    throw new Error((data?.data as Record<string, string>)?.error || (data.message as string) || `PayOnUs API error: ${res.status}`);
  }

  return (data.data ?? data) as T;
}

// ─── Dynamic Account (Virtual Account) ───────────────────────────────────────

export async function createDynamicAccount(
  payload: PayOnUsDynamicAccountRequest
): Promise<PayOnUsDynamicAccountResponse> {
  return payonusFetch<PayOnUsDynamicAccountResponse>(
    "/api/v1/virtual-accounts/dynamic",
    {
      method: "POST",
      body: JSON.stringify({
        amount: payload.amount,
        reference: payload.reference,
        businessId: process.env.PAYONUS_BUSINESS_ID!,
        customer: payload.customer,
      }),
    }
  );
}

// ─── Webhook Verification ─────────────────────────────────────────────────────

export function verifyPayOnUsWebhook(
  payload: PayOnUsWebhookPayload,
  receivedHash: string | null
): boolean {
  if (!receivedHash) return false;

  const verificationKey = process.env.PAYONUS_WEBHOOK_SECRET!;

  const verificationString =
    payload.accountNumber +
    payload.onusReference +
    payload.paymentStatus +
    verificationKey;

  const computed = crypto
    .createHash("sha256")
    .update(verificationString)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(receivedHash)
    );
  } catch {
    return false;
  }
}

// ─── Bank Transfer (Creator Payout) ──────────────────────────────────────────

export interface PayOnUsTransferRequest {
  reference: string;
  amount: number;
  beneficiaryAccountNumber: string;
  beneficiaryAccountName: string;
  beneficiaryBankCode: string;
  countryCode?: string;
  currency?: string;
  email: string;
  notificationUrl?: string;
}

export interface PayOnUsTransferResponse {
  paymentStatus: "PENDING" | "PROCESSING" | "SUCCESSFUL" | "FAILED" | "REJECTED";
  currency: string;
  amount: number;
  fee: number;
  onusReference: string;
  merchantReference: string;
}

export async function initiateBankTransfer(
  payload: PayOnUsTransferRequest
): Promise<PayOnUsTransferResponse> {
  return payonusFetch<PayOnUsTransferResponse>(
    "/api/v1/transfer-requests/bank-transfer",
    {
      method: "POST",
      body: JSON.stringify({
        reference:                payload.reference,
        amount:                   payload.amount,
        beneficiaryAccountNumber: payload.beneficiaryAccountNumber,
        beneficiaryAccountName:   payload.beneficiaryAccountName,
        beneficiaryBankCode:      payload.beneficiaryBankCode,
        transferType:             "WALLET_TO_BANK_ACCOUNT",
        countryCode:              payload.countryCode ?? "NG",
        currency:                 payload.currency ?? "NGN",
        businessId:               process.env.PAYONUS_BUSINESS_ID!,
        email:                    payload.email,
        notificationUrl:          payload.notificationUrl,
      }),
    }
  );
}

// ─── Name Enquiry ─────────────────────────────────────────────────────────────

export interface PayOnUsNameEnquiryResponse {
  accountNumber: string;
  accountName: string;
  bankCode: string;
  bankName: string;
}

export async function nameEnquiry(
  institutionCode: string,
  accountNumber: string
): Promise<PayOnUsNameEnquiryResponse> {
  return payonusFetch<PayOnUsNameEnquiryResponse>(
    "/api/v1/transfer-requests/name-enquiry",
    {
      method: "POST",
      body: JSON.stringify({
        institutionCode,
        accountNumber,
        businessId: process.env.PAYONUS_BUSINESS_ID!,
      }),
    }
  );
}

// ─── Reference Generator ──────────────────────────────────────────────────────

export function generatePayOnUsReference(prefix: string = "FREYA"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}