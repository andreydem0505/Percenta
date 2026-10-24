/** Percenta's locally drawn stack of cards. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect
        x="2"
        y="6.5"
        width="24"
        height="18"
        rx="4"
        transform="rotate(-12 14 15.5)"
        stroke="currentColor"
        strokeWidth="1.7"
        opacity=".65"
      />
      <rect
        x="8.3"
        y="13"
        width="25.5"
        height="18.4"
        rx="4"
        fill="var(--paper)"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M13 20h16M13 25h16" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
