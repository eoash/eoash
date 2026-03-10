interface InfoTipProps {
  text: string;
  wide?: boolean;
  below?: boolean;
  align?: "center" | "right";
}

export default function InfoTip({ text, wide, below, align = "center" }: InfoTipProps) {
  const isRight = align === "right";
  const posClass = isRight ? "right-0" : "left-1/2 -translate-x-1/2";
  const arrowPos = isRight ? "right-1.5" : "left-1/2 -translate-x-1/2";

  return (
    <span className="relative inline-flex items-center group/tip ml-1.5">
      <svg
        className="w-3.5 h-3.5 text-gray-500 cursor-help outline-none"
        tabIndex={0}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
      <span
        className={`invisible group-hover/tip:visible group-focus-within/tip:visible absolute z-[9999] ${posClass} rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-xs text-gray-300 leading-relaxed shadow-xl font-normal ${
          wide ? "w-64" : "w-56"
        } ${below ? "top-full mt-2" : "bottom-full mb-2"}`}
      >
        {text}
        <span className={`absolute ${arrowPos} w-0 h-0 border-x-[5px] border-x-transparent ${
          below
            ? "bottom-full border-b-[5px] border-b-[#333]"
            : "top-full border-t-[5px] border-t-[#333]"
        }`} />
      </span>
    </span>
  );
}
