"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { runSave } from "@/lib/save-action";
import {
  ORDER_RESPONSE_TEMPLATES,
  getOrderResponseTemplate,
  renderOrderResponseMessage,
  requestTypeLabel,
  type OrderRequest,
  type OrderResponseTemplateKey,
} from "@/lib/order-request";
import {
  respondToOrderRequest,
  subscribeOrderRequestsForOrder,
} from "@/services/order-request.service";

interface OrderRequestPanelProps {
  orderId: string;
  orderTotal: number;
}

function templatesForRequest(type: OrderRequest["type"], decision: "approved" | "rejected") {
  if (type === "cancel") {
    return decision === "approved"
      ? ORDER_RESPONSE_TEMPLATES.filter((t) => t.key === "cancel_approved")
      : ORDER_RESPONSE_TEMPLATES.filter((t) => t.key === "cancel_rejected");
  }
  return ORDER_RESPONSE_TEMPLATES.filter((t) =>
    decision === "approved"
      ? t.key === "refund_approved" || t.key === "refund_processing"
      : t.key === "refund_rejected"
  );
}

export function OrderRequestPanel({ orderId, orderTotal }: OrderRequestPanelProps) {
  const [requests, setRequests] = useState<OrderRequest[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");
  const [templateKey, setTemplateKey] = useState<OrderResponseTemplateKey>("cancel_approved");
  const [refundDays, setRefundDays] = useState(7);
  const [customNote, setCustomNote] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    return subscribeOrderRequestsForOrder(orderId, setRequests);
  }, [orderId]);

  const pending = requests.filter((r) => r.status === "pending");
  const active = pending.find((r) => r.id === activeId) ?? null;

  const availableTemplates = useMemo(() => {
    if (!active) return ORDER_RESPONSE_TEMPLATES;
    return templatesForRequest(active.type, decision);
  }, [active, decision]);

  useEffect(() => {
    if (!active) return;
    const templates = templatesForRequest(active.type, decision);
    if (!templates.find((t) => t.key === templateKey)) {
      setTemplateKey(templates[0]?.key ?? "cancel_approved");
    }
  }, [active, decision, templateKey]);

  useEffect(() => {
    const template = getOrderResponseTemplate(templateKey);
    setRefundDays(template.defaultRefundDays || 7);
  }, [templateKey]);

  const preview = renderOrderResponseMessage(templateKey, {
    refundDays,
    customNote,
    amount: formatCurrency(orderTotal),
  });

  const selectedTemplate = getOrderResponseTemplate(templateKey);

  async function sendResponse() {
    if (!active) return;
    setSending(true);
    await runSave(
      () =>
        respondToOrderRequest({
          requestId: active.id,
          orderId: active.orderId,
          requestType: active.type,
          decision,
          templateKey,
          refundDays: selectedTemplate.showRefundDays ? refundDays : undefined,
          customNote,
          orderTotal,
        }),
      {
        successMessage: "Response sent — customer can see it on their orders page",
        liveOnStorefront: false,
        onSuccess: () => {
          setActiveId(null);
          setCustomNote("");
        },
      }
    );
    setSending(false);
  }

  if (requests.length === 0) return null;

  return (
    <Card className="mb-6 border-amber-200 bg-amber-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Cancel / refund requests
          {pending.length > 0 && (
            <Badge variant="warning">{pending.length} pending</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {requests.map((req) => (
          <div
            key={req.id}
            className={`rounded-lg border bg-white p-4 ${
              req.status === "pending" ? "border-amber-300" : "border-zinc-200"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {requestTypeLabel(req.type)} request
                  <Badge variant={req.status === "pending" ? "warning" : req.status === "approved" ? "success" : "destructive"} className="ml-2">
                    {req.status}
                  </Badge>
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatDate(req.createdAt)} · {req.customerName}
                  {req.customerEmail ? ` · ${req.customerEmail}` : ""}
                </p>
              </div>
              {req.status === "pending" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setActiveId(req.id);
                    setDecision("approved");
                    setTemplateKey(
                      req.type === "cancel" ? "cancel_approved" : "refund_processing"
                    );
                  }}
                >
                  Respond
                </Button>
              )}
            </div>
            <p className="mt-3 text-sm text-zinc-700">{req.reason}</p>
            {req.adminResponse && (
              <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Sent to customer</p>
                <p className="mt-1">{req.adminResponse.message}</p>
                <p className="mt-2 text-xs text-emerald-700">
                  {formatDate(new Date(req.adminResponse.sentAt))}
                </p>
              </div>
            )}
          </div>
        ))}

        {active && active.status === "pending" && activeId === active.id && (
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h3 className="font-medium">Reply to {requestTypeLabel(active.type).toLowerCase()} request</h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Decision</label>
                <Select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value as "approved" | "rejected")}
                >
                  <option value="approved">Approve</option>
                  <option value="rejected">Decline</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Message template</label>
                <Select
                  value={templateKey}
                  onChange={(e) => setTemplateKey(e.target.value as OrderResponseTemplateKey)}
                >
                  {availableTemplates.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {selectedTemplate.showRefundDays && (
              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Refund timeline (business days)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={refundDays}
                  onChange={(e) => setRefundDays(Math.max(1, Number(e.target.value) || 7))}
                />
              </div>
            )}

            {selectedTemplate.showCustomNote && (
              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Additional note (optional)
                </label>
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  rows={2}
                  placeholder="Any extra details for the customer..."
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
            )}

            <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Customer will see</p>
              <p className="mt-1">{preview}</p>
            </div>

            <div className="mt-4 flex gap-2">
              <Button onClick={sendResponse} disabled={sending}>
                {sending ? "Sending..." : "Send message to customer"}
              </Button>
              <Button variant="outline" onClick={() => setActiveId(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
