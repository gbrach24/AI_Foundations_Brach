interface StatusMessageProps {
  kind: 'loading' | 'error' | 'empty'
  message: string
  onRetry?: () => void
}

/** Shared loading / error / empty state so pages degrade gracefully. */
export default function StatusMessage({ kind, message, onRetry }: StatusMessageProps) {
  return (
    <div className={`status status-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {kind === 'loading' && <span className="spinner" aria-hidden="true" />}
      <p>{message}</p>
      {onRetry && (
        <button className="btn btn-outline" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}
