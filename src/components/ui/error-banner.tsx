export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-medium">Could not load data</p>
      <p className="mt-1 text-amber-700">{message}</p>
      {onRetry && (
        <button type="button" className="mt-2 text-xs font-medium underline" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
