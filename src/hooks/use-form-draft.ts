import { useEffect, useRef } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { clearFormDraft, loadFormDraft, saveFormDraft } from "@/lib/form-draft";

type DraftPayload<T> = T & { images?: string[] };

export function useFormDraft<T extends FieldValues>(
  draftKey: string,
  form: UseFormReturn<T>,
  extras: { images?: string[]; setImages?: (urls: string[]) => void },
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? true;
  const restored = useRef(false);
  const { watch, reset } = form;

  useEffect(() => {
    if (!enabled || restored.current) return;
    const draft = loadFormDraft<DraftPayload<T>>(draftKey);
    if (!draft) return;

    const { images, _savedAt, ...fields } = draft as DraftPayload<T> & { _savedAt?: number };
    reset(fields as T);
    if (images?.length && extras.setImages) extras.setImages(images);
    restored.current = true;
    toast.message("Draft restored from last session", {
      description: "Your unsaved work was loaded from this browser.",
    });
  }, [draftKey, enabled, extras.setImages, reset]);

  useEffect(() => {
    if (!enabled) return;
    const sub = watch((values) => {
      saveFormDraft(draftKey, { ...values, images: extras.images ?? [] });
    });
    return () => sub.unsubscribe();
  }, [draftKey, enabled, extras.images, watch]);

  return {
    clearDraft: () => clearFormDraft(draftKey),
  };
}
