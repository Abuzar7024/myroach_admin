export type OrderRequestType = "refund" | "exchange";
export type OrderRequestStatus = "pending" | "approved" | "rejected";

export type OrderResponseTemplateKey =
  | "refund_approved"
  | "refund_rejected"
  | "refund_processing"
  | "exchange_approved"
  | "exchange_rejected"
  | "exchange_processing"
  | "cancel_approved"
  | "cancel_rejected";

export interface OrderRequestAdminResponse {
  templateKey: OrderResponseTemplateKey;
  message: string;
  refundDays?: number;
  customNote?: string;
  sentAt: string;
}

export interface OrderRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail?: string;
  orderTotal: number;
  type: OrderRequestType;
  status: OrderRequestStatus;
  reason: string;
  exchangeDetails?: string;
  policyAccepted?: boolean;
  adminResponse?: OrderRequestAdminResponse;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderResponseTemplate {
  key: OrderResponseTemplateKey;
  label: string;
  defaultMessage: string;
  showRefundDays: boolean;
  defaultRefundDays: number;
  showCustomNote: boolean;
}

export const ORDER_RESPONSE_TEMPLATES: OrderResponseTemplate[] = [
  {
    key: "refund_processing",
    label: "Refund — processing",
    defaultMessage:
      "We received your refund request and it is being processed. You will receive your payment within {refundDays} business days if approved.",
    showRefundDays: true,
    defaultRefundDays: 7,
    showCustomNote: true,
  },
  {
    key: "refund_approved",
    label: "Refund approved",
    defaultMessage:
      "Your refund has been approved. You will receive {amount} within {refundDays} business days.",
    showRefundDays: true,
    defaultRefundDays: 7,
    showCustomNote: true,
  },
  {
    key: "refund_rejected",
    label: "Refund declined",
    defaultMessage: "Your refund request could not be approved at this time.",
    showRefundDays: false,
    defaultRefundDays: 0,
    showCustomNote: true,
  },
  {
    key: "exchange_processing",
    label: "Exchange — processing",
    defaultMessage:
      "We received your exchange request and our team is reviewing it. We'll confirm size or product availability shortly.",
    showRefundDays: false,
    defaultRefundDays: 0,
    showCustomNote: true,
  },
  {
    key: "exchange_approved",
    label: "Exchange approved",
    defaultMessage:
      "Your exchange has been approved. We will ship your replacement after we receive or verify your return.",
    showRefundDays: false,
    defaultRefundDays: 0,
    showCustomNote: true,
  },
  {
    key: "exchange_rejected",
    label: "Exchange declined",
    defaultMessage: "Your exchange request could not be approved at this time.",
    showRefundDays: false,
    defaultRefundDays: 0,
    showCustomNote: true,
  },
  {
    key: "cancel_approved",
    label: "Cancellation approved (legacy)",
    defaultMessage: "Your cancellation request has been approved. Your order will not be shipped.",
    showRefundDays: false,
    defaultRefundDays: 0,
    showCustomNote: true,
  },
  {
    key: "cancel_rejected",
    label: "Cancellation declined (legacy)",
    defaultMessage:
      "We could not cancel your order because it is already being prepared for dispatch.",
    showRefundDays: false,
    defaultRefundDays: 0,
    showCustomNote: true,
  },
];

export function normalizeRequestType(value: unknown): OrderRequestType {
  if (value === "exchange") return "exchange";
  return "refund";
}

export function getOrderResponseTemplate(key: OrderResponseTemplateKey) {
  return ORDER_RESPONSE_TEMPLATES.find((t) => t.key === key) ?? ORDER_RESPONSE_TEMPLATES[0];
}

export function renderOrderResponseMessage(
  templateKey: OrderResponseTemplateKey,
  params: { refundDays?: number; customNote?: string; amount?: string }
): string {
  const template = getOrderResponseTemplate(templateKey);
  let text = template.defaultMessage;
  const days = params.refundDays ?? template.defaultRefundDays;
  text = text.replace(/\{refundDays\}/g, String(days));
  if (params.amount) text = text.replace(/\{amount\}/g, params.amount);
  if (params.customNote?.trim()) {
    text = `${text.trim()} ${params.customNote.trim()}`;
  }
  return text;
}

export function requestTypeLabel(type: OrderRequestType) {
  return type === "exchange" ? "Exchange" : "Refund";
}

export function requestStatusLabel(status: OrderRequestStatus) {
  if (status === "pending") return "Pending review";
  if (status === "approved") return "Approved";
  return "Declined";
}
