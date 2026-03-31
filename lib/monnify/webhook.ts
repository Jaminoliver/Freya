// lib/monnify/webhook.ts
// Webhook signature verification and event type definitions for Monnify
// Monnify uses HMAC-SHA512(clientSecretKey, requestBody) in 'monnify-signature' header

import crypto from "crypto";

const MONNIFY_SECRET_KEY = process.env.MONNIFY_SECRET_KEY!;

// Monnify webhook IP — whitelist for extra security
export const MONNIFY_WEBHOOK_IP = "35.242.133.146";

/**
 * Verify that a webhook request is genuinely from Monnify
 * Computes HMAC-SHA512 of the raw request body using your secret key
 * and compares it to the monnify-signature header
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  if (!signatureHeader) {
    console.error("[Monnify Webhook] No monnify-signature header present");
    return false;
  }

  const computedHash = crypto
    .createHmac("sha512", MONNIFY_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  const isValid = computedHash.toLowerCase() === signatureHeader.toLowerCase();

  if (!isValid) {
    console.error("[Monnify Webhook] Signature mismatch");
    console.error("[Monnify Webhook] Computed:", computedHash.substring(0, 20) + "...");
    console.error("[Monnify Webhook] Received:", signatureHeader.substring(0, 20) + "...");
  }

  return isValid;
}

// ============================================================
// MONNIFY EVENT TYPES
// ============================================================

export type MonnifyEventType =
  | "SUCCESSFUL_TRANSACTION"
  | "FAILED_TRANSACTION"
  | "SUCCESSFUL_DISBURSEMENT"
  | "FAILED_DISBURSEMENT"
  | "REVERSED_DISBURSEMENT"
  | "COMPLETION"
  | "REFUND_COMPLETION";

// ============================================================
// WEBHOOK PAYLOAD TYPES
// ============================================================

/** Transaction completion webhook (payment received) */
export interface MonnifyTransactionEvent {
  eventType: "SUCCESSFUL_TRANSACTION" | "FAILED_TRANSACTION";
  eventData: {
    transactionReference: string;
    paymentReference: string;
    amountPaid: number;
    totalPayable: number;
    settlementAmount: number;
    paidOn: string;
    paymentStatus: "PAID" | "FAILED" | "OVERPAID" | "PARTIALLY_PAID" | "PENDING" | "ABANDONED" | "CANCELLED" | "REVERSED";
    paymentDescription: string;
    transactionHash: string;
    currency: string;
    paymentMethod: "CARD" | "ACCOUNT_TRANSFER";
    product: {
      type: "WEB_SDK" | "RESERVED_ACCOUNT" | "INVOICE" | "OFFLINE_PAYMENT_AGENT";
      reference: string;
    };
    cardDetails: {
      cardType: string | null;
      last4: string | null;
      expMonth: string | null;
      expYear: string | null;
      bin: string | null;
      bankCode: string | null;
      bankName: string | null;
      reusableToken: string | null;
    } | null;
    accountDetails: {
      accountName: string;
      accountNumber: string;
      bankCode: string;
      amountPaid: string;
    } | null;
    accountPayments: Array<{
      accountName: string;
      accountNumber: string;
      bankCode: string;
      amountPaid: string;
    }> | null;
    customer: {
      email: string;
      name: string;
    };
    metaData: Record<string, any>;
  };
}

/** Disbursement (transfer/payout) completion webhook */
export interface MonnifyDisbursementEvent {
  eventType: "SUCCESSFUL_DISBURSEMENT" | "FAILED_DISBURSEMENT" | "REVERSED_DISBURSEMENT";
  eventData: {
    amount: number;
    reference: string;
    narration: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    bankName: string;
    dateCreated: string;
    currency: string;
    status: "SUCCESS" | "FAILED" | "REVERSED";
    fee: number;
    transactionDescription: string;
    sessionId: string;
    destinationBankCode: string;
    destinationAccountNumber: string;
    destinationBankName: string;
  };
}

/** Refund completion webhook */
export interface MonnifyRefundEvent {
  eventType: "REFUND_COMPLETION";
  eventData: {
    transactionReference: string;
    refundReference: string;
    refundAmount: number;
    refundStatus: string;
    refundReason: string;
    currency: string;
    completedOn: string;
  };
}

/** Union type for all webhook events */
export type MonnifyWebhookEvent =
  | MonnifyTransactionEvent
  | MonnifyDisbursementEvent
  | MonnifyRefundEvent;

/**
 * Parse and type a webhook event from raw body
 */
export function parseWebhookEvent(rawBody: string): MonnifyWebhookEvent {
  return JSON.parse(rawBody) as MonnifyWebhookEvent;
}

/**
 * Check if event is a successful transaction (payment received)
 */
export function isSuccessfulTransaction(
  event: MonnifyWebhookEvent
): event is MonnifyTransactionEvent {
  return event.eventType === "SUCCESSFUL_TRANSACTION";
}

/**
 * Check if event is a failed transaction
 */
export function isFailedTransaction(
  event: MonnifyWebhookEvent
): event is MonnifyTransactionEvent {
  return event.eventType === "FAILED_TRANSACTION";
}

/**
 * Check if event is a successful disbursement (payout completed)
 */
export function isSuccessfulDisbursement(
  event: MonnifyWebhookEvent
): event is MonnifyDisbursementEvent {
  return event.eventType === "SUCCESSFUL_DISBURSEMENT";
}

/**
 * Check if event is a failed disbursement (payout failed)
 */
export function isFailedDisbursement(
  event: MonnifyWebhookEvent
): event is MonnifyDisbursementEvent {
  return (
    event.eventType === "FAILED_DISBURSEMENT" ||
    event.eventType === "REVERSED_DISBURSEMENT"
  );
}