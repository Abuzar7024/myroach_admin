export type UploadProgress = {
  phase: "preflight" | "uploading" | "finalizing";
  percent: number;
  label: string;
};

export type UploadReadiness = {
  allowed: boolean;
  reason?: string;
};
