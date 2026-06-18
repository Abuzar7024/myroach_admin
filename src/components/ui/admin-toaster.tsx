"use client";

import { Toaster } from "sonner";

export function AdminToaster() {
  return (
    <Toaster
      position="top-right"
      closeButton
      richColors
      toastOptions={{
        duration: 5000,
        classNames: {
          closeButton:
            "!left-auto !right-0 !top-0 !translate-x-[35%] !-translate-y-[35%] !border-zinc-300 !bg-white !text-zinc-500 hover:!text-zinc-900",
        },
      }}
    />
  );
}
