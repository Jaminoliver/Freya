// lib/monnify/client.ts
// Server-side Monnify API client
// Uses OAuth 2.0 Basic Auth → Bearer token with in-memory caching

const MONNIFY_API_KEY = process.env.MONNIFY_API_KEY!;
const MONNIFY_SECRET_KEY = process.env.MONNIFY_SECRET_KEY!;
const MONNIFY_CONTRACT_CODE = process.env.MONNIFY_CONTRACT_CODE!;
const MONNIFY_BASE_URL = process.env.MONNIFY_BASE_URL!;

// In-memory token cache
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Get Monnify access token (cached until expiry)
 * Exported so other server modules can reuse the same cached token
 */
export async function getMonnifyAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  const credentials = Buffer.from(`${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`).toString("base64");

  const response = await fetch(`${MONNIFY_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Monnify Auth] Failed to get access token:", response.status, errorText);
    throw new Error(`Monnify auth failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.requestSuccessful) {
    console.error("[Monnify Auth] Token request unsuccessful:", data.responseMessage);
    throw new Error(`Monnify auth unsuccessful: ${data.responseMessage}`);
  }

  cachedToken = data.responseBody.accessToken;
  // Monnify tokens typically expire in ~300s, use their expiresIn value
  const expiresInMs = (data.responseBody.expiresIn || 300) * 1000;
  tokenExpiresAt = now + expiresInMs;

  console.log("[Monnify Auth] New access token obtained, expires in", data.responseBody.expiresIn, "seconds");

  return cachedToken!;
}

/**
 * Make an authenticated request to Monnify API
 */
async function monnifyRequest<T = any>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: Record<string, any>;
  } = {}
): Promise<T> {
  const { method = "GET", body } = options;
  const token = await getMonnifyAccessToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body && method !== "GET") {
    fetchOptions.body = JSON.stringify(body);
  }

  const url = `${MONNIFY_BASE_URL}${endpoint}`;

  console.log(`[Monnify API] ${method} ${endpoint}`);

  const response = await fetch(url, fetchOptions);
  const data = await response.json();

  if (!response.ok || !data.requestSuccessful) {
    console.error(`[Monnify API] Error on ${method} ${endpoint}:`, data.responseMessage || response.statusText);
    throw new MonnifyError(
      data.responseMessage || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }

  return data as T;
}

/**
 * Custom error class for Monnify API errors
 */
export class MonnifyError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = "MonnifyError";
    this.status = status;
    this.data = data;
  }
}

// ============================================================
// PUBLIC API METHODS
// ============================================================

/**
 * Initialize a transaction (card or bank transfer payment)
 * Returns a checkout URL for card payments or account details for bank transfer
 */
export async function initializeTransaction(params: {
  amount: number; // in kobo — we convert to naira for Monnify
  customerName: string;
  customerEmail: string;
  paymentReference: string;
  paymentDescription: string;
  redirectUrl: string;
  paymentMethods?: ("CARD" | "ACCOUNT_TRANSFER")[];
  metadata?: Record<string, any>;
}) {
  const amountInNaira = params.amount / 100;

  const requestBody = {
    amount: amountInNaira,
    customerName: params.customerName,
    customerEmail: params.customerEmail,
    paymentReference: params.paymentReference,
    paymentDescription: params.paymentDescription,
    currencyCode: "NGN",
    contractCode: MONNIFY_CONTRACT_CODE,
    redirectUrl: params.redirectUrl,
    paymentMethods: params.paymentMethods || ["CARD", "ACCOUNT_TRANSFER"],
    ...(params.metadata && { metaData: params.metadata }),
  };

  console.log("[Monnify initializeTransaction] Input amountKobo:", params.amount);
  console.log("[Monnify initializeTransaction] Sending amountNaira:", amountInNaira);
  console.log("[Monnify initializeTransaction] Full request body:", JSON.stringify(requestBody, null, 2));

  const response = await monnifyRequest<{
    requestSuccessful: boolean;
    responseMessage: string;
    responseBody: {
      transactionReference: string;
      paymentReference: string;
      merchantName: string;
      apiKey: string;
      enabledPaymentMethod: string[];
      checkoutUrl: string;
    };
  }>("/api/v1/merchant/transactions/init-transaction", {
    method: "POST",
    body: requestBody,
  });

  console.log("[Monnify initializeTransaction] Response:", JSON.stringify(response.responseBody, null, 2));

  return response.responseBody;
}

/**
 * Verify a transaction by reference
 */
export async function verifyTransaction(transactionReference: string) {
  const encodedRef = encodeURIComponent(transactionReference);

  const response = await monnifyRequest<{
    requestSuccessful: boolean;
    responseMessage: string;
    responseBody: {
      transactionReference: string;
      paymentReference: string;
      amountPaid: number;
      totalPayable: number;
      paymentStatus: string;
      paymentMethod: string;
      currency: string;
      customer: { email: string; name: string };
      metaData: Record<string, any>;
    };
  }>(`/api/v2/transactions/${encodedRef}`);

  return response.responseBody;
}

/**
 * Get list of all Nigerian banks (for creator payout account setup)
 */
export async function getBanks() {
  const response = await monnifyRequest<{
    requestSuccessful: boolean;
    responseMessage: string;
    responseBody: Array<{
      name: string;
      code: string;
      ussdTemplate: string | null;
      baseUssdCode: string | null;
      transferUssdTemplate: string | null;
    }>;
  }>("/api/v1/banks");

  return response.responseBody;
}

/**
 * Validate a bank account (name enquiry)
 * Returns the account name from the bank — never let users type this manually
 */
export async function validateBankAccount(accountNumber: string, bankCode: string) {
  const response = await monnifyRequest<{
    requestSuccessful: boolean;
    responseMessage: string;
    responseBody: {
      accountNumber: string;
      accountName: string;
      bankCode: string;
    };
  }>(`/api/v1/disbursements/account/validate?accountNumber=${accountNumber}&bankCode=${bankCode}`);

  return response.responseBody;
}

/**
 * Initiate a single transfer (creator payout)
 */
export async function initiateTransfer(params: {
  amount: number; // in kobo — we convert to naira for Monnify
  reference: string;
  narration: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  currency?: string;
}) {
  const response = await monnifyRequest<{
    requestSuccessful: boolean;
    responseMessage: string;
    responseBody: {
      amount: number;
      reference: string;
      status: string;
      dateCreated: string;
      totalFee: number;
      destinationBankCode: string;
      destinationAccountNumber: string;
      destinationBankName: string;
    };
  }>("/api/v2/disbursements/single", {
    method: "POST",
    body: {
      amount: params.amount / 100, // Convert kobo to naira for Monnify
      reference: params.reference,
      narration: params.narration,
      destinationBankCode: params.bankCode,
      destinationAccountNumber: params.accountNumber,
      destinationAccountName: params.accountName,
      currency: params.currency || "NGN",
      sourceAccountNumber: process.env.MONNIFY_WALLET_ACCOUNT_NUMBER || "",
    },
  });

  return response.responseBody;
}

/**
 * Get the status of a transfer (for checking payout status)
 */
export async function getTransferStatus(reference: string) {
  const encodedRef = encodeURIComponent(reference);

  const response = await monnifyRequest<{
    requestSuccessful: boolean;
    responseMessage: string;
    responseBody: {
      amount: number;
      reference: string;
      status: string;
      destinationBankCode: string;
      destinationAccountNumber: string;
      destinationBankName: string;
      dateCreated: string;
    };
  }>(`/api/v2/disbursements/single/summary?reference=${encodedRef}`);

  return response.responseBody;
}

/**
 * Reserve a bank account for a customer (permanent virtual account)
 * Used for fans who want a dedicated account for wallet top-ups
 */
export async function reserveAccount(params: {
  accountReference: string;
  accountName: string;
  customerEmail: string;
  customerName: string;
  customerBvn?: string;
  nin?: string;
}) {
  const response = await monnifyRequest<{
    requestSuccessful: boolean;
    responseMessage: string;
    responseBody: {
      contractCode: string;
      accountReference: string;
      accountName: string;
      currencyCode: string;
      customerEmail: string;
      customerName: string;
      accounts: Array<{
        bankCode: string;
        bankName: string;
        accountNumber: string;
        accountName: string;
      }>;
      collectionChannel: string;
      reservationReference: string;
      reservedAccountType: string;
      status: string;
    };
  }>("/api/v2/bank-transfer/reserved-accounts", {
    method: "POST",
    body: {
      accountReference: params.accountReference,
      accountName: params.accountName,
      currencyCode: "NGN",
      contractCode: MONNIFY_CONTRACT_CODE,
      customerEmail: params.customerEmail,
      customerName: params.customerName,
      getAllAvailableBanks: false,
      ...(params.customerBvn && { bvn: params.customerBvn }),
      ...(params.nin && { nin: params.nin }),
    },
  });

  return response.responseBody;
}

// Export the contract code for use in other modules
export const MONNIFY_CONFIG = {
  contractCode: MONNIFY_CONTRACT_CODE,
  baseUrl: MONNIFY_BASE_URL,
} as const;