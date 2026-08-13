type Props = {
  size?: number;
  className?: string;
};

/** SentryAI mark: a radar arc rising from a location pin, on an ink tile. */
export function SentryLogo({ size = 44, className }: Props) {
  return (
    <svg
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 40 40"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#14161a" height="40" rx="10" width="40" />
      <path
        d="M12 26c0-6 4-11 8-11s8 5 8 11"
        stroke="#8e2a3b"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
      <circle cx="20" cy="15" fill="#8e2a3b" r="2.6" />
    </svg>
  );
}
