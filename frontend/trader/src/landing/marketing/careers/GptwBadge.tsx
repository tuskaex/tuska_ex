interface GptwBadgeProps {
  className?: string
}

export default function GptwBadge({ className = '' }: GptwBadgeProps) {
  return (
    <div
      className={`inline-flex flex-col items-center select-none shadow-lg ${className}`}
      aria-label="Great Place To Work Certified"
    >
      <div className="w-24 md:w-28 bg-[#C8102E] text-white text-center py-3 px-2 font-extrabold leading-tight">
        <div className="text-[11px] md:text-xs uppercase tracking-tight">
          Great
          <br />
          Place
          <br />
          To Work
          <span className="align-super text-[8px]">®</span>
        </div>
      </div>
      <div className="w-24 md:w-28 bg-[#0B2A52] text-white text-center py-2 px-2">
        <div className="text-[10px] md:text-[11px] font-bold">Certified</div>
        <div className="text-[8px] md:text-[9px] mt-1 leading-tight">FEB 2024-FEB 2025</div>
        <div className="text-[8px] md:text-[9px] mt-0.5">CH</div>
      </div>
    </div>
  )
}
