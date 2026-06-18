export type OrderRequestType = "cancel" | "refund";
export type OrderRequestStatus = "pending" | "approved" | "rejected";

export type OrderResponseTemplateKey =
  | "cancel_approved"
  | "cancel_rejected"
  | "refund_approved"
  | "refund_rejected"
  | "refund_processing";

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
    key: "cancel_approved",
    label: "Cancellation approved",
    defaultMessage: "Your cancellation request has been approved. Your order will not be shipped.",
    showRefundDays: false,
    defaultRefundDays: 0,
    showCustomNote: true,
  },
  {
    key: "cancel_rejected",
    label: "Cancellation declined",
    defaultMessage:
      "We could not cancel your order because it is already being prepared for dispatch. Contact support if you need help.",
    showRefundDays: false,
    defaultRefundDays: 0,
    showCustomNote: true,
  },
  {
    key: "refund_approved",
    label: "Refund approved",
    defaultMessage:
      "Your refund has been approved. You will receive your payment within {refundDays} business days.",
    showRefundDays: true,
    defaultRefundDays: 7,
    showCustomNote: true,
  },
  {
    key: "refund_processing",
    label: "Refund processing",
    defaultMessage:
      "We are processing your refund. You will receive your payment within {refundDays} business days.",
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
];

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
  return type === "cancel" ? "Cancellation" : "Refund";
}
