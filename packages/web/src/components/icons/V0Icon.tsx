/**
 * v0 icon
 */

interface IconProps {
  className?: string;
  size?: number;
}

export function V0Icon({ className, size = 24 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
        fontSize="14"
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        v0
      </text>
    </svg>
  );
}
