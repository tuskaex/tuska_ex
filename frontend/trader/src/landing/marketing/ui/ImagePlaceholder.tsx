import { ImageIcon } from 'lucide-react'

interface ImagePlaceholderProps {
  className?: string
  label?: string
  rounded?: string
  showIcon?: boolean
}

export default function ImagePlaceholder({
  className = '',
  label = 'Image',
  rounded = 'rounded-2xl',
  showIcon = true,
}: ImagePlaceholderProps) {
  return (
    <div
      className={`relative bg-gray-100 border border-gray-200 ${rounded} overflow-hidden flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-2 text-gray-500/70 select-none">
        {showIcon && <ImageIcon className="w-6 h-6" strokeWidth={1.5} />}
        {label && (
          <span className="text-xs uppercase tracking-widest font-medium">{label}</span>
        )}
      </div>
    </div>
  )
}
