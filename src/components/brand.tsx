export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M9 28V8h19M9 18h13"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="square"
      />
      <circle cx="26" cy="18" r="4" fill="var(--coral)" />
    </svg>
  );
}
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-lockup">
      <span className="brand-symbol">
        <BrandMark />
      </span>
      {!compact && (
        <span className="brand-wordmark">
          FirstCustomers<span className="brand-period">.</span>
        </span>
      )}
    </span>
  );
}
