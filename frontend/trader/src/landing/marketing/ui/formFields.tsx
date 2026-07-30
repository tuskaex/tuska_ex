'use client'

import { type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

export const inputClasses =
  'w-full h-11 px-3 bg-white border border-gray-200 rounded-md text-sm text-gray-900 placeholder:text-gray-600/70 focus:outline-none focus:border-[#E94E1B] transition-colors'

export const textareaClasses =
  'w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-900 placeholder:text-gray-600/70 focus:outline-none focus:border-[#E94E1B] transition-colors resize-y'

interface FieldProps {
  label?: ReactNode
  required?: boolean
  children: ReactNode
  className?: string
}

export function Field({ label, required = false, children, className = '' }: FieldProps) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      {label !== undefined && label !== '' && (
        <span className="text-xs font-medium text-gray-900">
          {required && <span className="text-[#E94E1B] mr-0.5">*</span>}
          {label}
        </span>
      )}
      {children}
    </label>
  )
}

interface SelectProps {
  children: ReactNode
  defaultValue: string
  placeholder?: string
}

export function Select({ children, defaultValue, placeholder }: SelectProps) {
  return (
    <div className="relative">
      <select defaultValue={defaultValue} className={`${inputClasses} appearance-none pr-10`}>
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
      <ChevronDown
        className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none"
        strokeWidth={2}
      />
    </div>
  )
}
