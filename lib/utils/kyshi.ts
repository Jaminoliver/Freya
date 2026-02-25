import type {
  Currency,
  KyshiInitializeRequest,
  KyshiInitializeResponse,
  KyshiChargeRequest,
  KyshiChargeResponse,
  KyshiVerifyResponse,
  KyshiVirtualAccountRequest,
  KyshiVirtualAccountResponse,
  KyshiBanksResponse,
  KyshiNameEnquiryRequest,
  KyshiNameEnquiryResponse,
  KyshiCreateBeneficiaryRequest,
  KyshiCreateBeneficiaryResponse,
  KyshiTransferRequest,
  KyshiTransferResponse,
} from "@/lib/types/checkout";

// ─── Config ──────────────────────────────────────────────────────────────────

const KYSHI_BASE_URL = process.env.KYSHI_BASE_URL!;
const KYSHI_SECRET_KEY = process.env.KYSHI_SECRET_KEY!;

// ─── Base Fetcher ─────────────────────────────────────────────────────────────

async function kyshiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${KYSHI_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": KYSHI_SECRET_KEY,
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok || !data.status) {
    throw new Error(data.message || "Kyshi API error");
  }

  return data as T;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function initializeTransaction(
  payload: KyshiInitializeRequest
): Promise<KyshiInitializeResponse> {
  const { currency, ...rest } = payload;
  return kyshiFetch<KyshiInitializeResponse>("/transactions/initialize", {
    method: "POST",
    body: JSON.stringify({ ...rest, localCurrency: currency }),
  });
}

export async function chargeTransaction(
  payload: KyshiChargeRequest
): Promise<KyshiChargeResponse> {
  const { currency, ...rest } = payload;
  return kyshiFetch<KyshiChargeResponse>("/transactions/charge", {
    method: "POST",
    body: JSON.stringify({ ...rest, localCurrency: currency }),
  });
}

export async function verifyTransaction(
  reference: string
): Promise<KyshiVerifyResponse> {
  return kyshiFetch<KyshiVerifyResponse>(`/transactions/verify/${reference}`);
}

// ─── Virtual Accounts ────────────────────────────────────────────────────────

export async function createVirtualAccount(
  payload: KyshiVirtualAccountRequest
): Promise<KyshiVirtualAccountResponse> {
  const { currency, ...rest } = payload;
  return kyshiFetch<KyshiVirtualAccountResponse>("/virtual-accounts", {
    method: "POST",
    body: JSON.stringify({ ...rest, localCurrency: currency }),
  });
}

// ─── Banks ───────────────────────────────────────────────────────────────────

export async function getBanks(): Promise<KyshiBanksResponse> {
  return kyshiFetch<KyshiBanksResponse>("/banks");
}

// ─── Name Enquiry ────────────────────────────────────────────────────────────

export async function nameEnquiry(
  payload: KyshiNameEnquiryRequest
): Promise<KyshiNameEnquiryResponse> {
  return kyshiFetch<KyshiNameEnquiryResponse>("/name-enquiry", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Beneficiaries ───────────────────────────────────────────────────────────

export async function createBeneficiary(
  payload: KyshiCreateBeneficiaryRequest
): Promise<KyshiCreateBeneficiaryResponse> {
  return kyshiFetch<KyshiCreateBeneficiaryResponse>("/beneficiaries", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Transfers ───────────────────────────────────────────────────────────────

export async function initiateTransfer(
  payload: KyshiTransferRequest
): Promise<KyshiTransferResponse> {
  return kyshiFetch<KyshiTransferResponse>("/transfer", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Webhook Verification ────────────────────────────────────────────────────

export function verifyWebhookSignature(
  receivedHash: string | null
): boolean {
  if (!receivedHash) return false;
  const webhookSecret = process.env.KYSHI_WEBHOOK_SECRET!;
  return receivedHash === webhookSecret;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function generateReference(prefix: string = "FREYA"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}