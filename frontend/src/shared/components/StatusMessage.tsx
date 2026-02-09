interface StatusMessageProps {
  status: string;
  fallback?: string;
  className?: string;
}

/**
 * Render a status message when content is available.
 * @param props Status message props.
 * @returns Status message element or null.
 */
export function StatusMessage({ status, fallback, className = 'text-gray-600' }: StatusMessageProps) {
  const message = status || fallback || '';
  if (!message) return null;
  return <div className={className}>{message}</div>;
}
