interface InfoTipProps {
  text: string;
  wide?: boolean;
  below?: boolean;
}

export default function InfoTip({ text, wide, below }: InfoTipProps) {
  return (
    <span className="relative inline-flex items-center group/tip">
      <svg
        className="w-3.5 h-3.5 text-gray-500 cursor-help"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
      <span
        className={`invisible group-hover/tip:visible absolute z-50 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-gray-300 shadow-lg ${
          wide ? "w-64" : "w-56"
        } ${
          below
            ? "top-full mt-1.5 left-1/2 -translate-x-1/2"
            : "bottom-full mb-1.5 left-1/2 -translate-x-1/2"
        }`}
      >
        {text}
      </span>
    </span>
  );
}
