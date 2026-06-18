import { toast } from "sonner";
import { STORE_URL } from "@/lib/config";
import { emitAdminNotification } from "@/lib/admin-notifications";

export async function runSave<T>(
  action: () => Promise<T>,
  options?: {
    successMessage?: string;
    /** When true (default), toast notes that the live storefront will update. */
    liveOnStorefront?: boolean;
    /** Link for "Check" action on storefront notification. */
    storefrontHref?: string;
    onSuccess?: (result: T) => void | Promise<void>;
  }
): Promise<T | null> {
  try {
    const result = await action();
    if (options?.successMessage) {
      const liveOnStorefront = options.liveOnStorefront !== false;
      toast.success(options.successMessage, {
        description: liveOnStorefront
          ? "Live on the storefront — open the bell panel to track updates."
          : undefined,
        duration: 6000,
        action: liveOnStorefront
          ? {
              label: "View store",
              onClick: () => window.open(options.storefrontHref ?? STORE_URL, "_blank"),
            }
          : undefined,
      });
      if (liveOnStorefront) {
        emitAdminNotification({
          id: `save-${Date.now()}`,
          type: "storefront",
          title: "Live on storefront",
          message: options.successMessage,
          href: options.storefrontHref ?? STORE_URL,
          silent: true,
        });
      }
    }
    if (options?.onSuccess) await options.onSuccess(result);
    return result;
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Save failed — nothing was saved to the database.",
      { duration: 6000 }
    );
    return null;
  }
}
