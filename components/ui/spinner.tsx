import { Loader2Icon } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface SpinnerProps extends React.ComponentProps<'svg'> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | number | string
}

function Spinner({ className, size, ...props }: SpinnerProps) {
  const sizeClasses: Record<string, string> = {
    sm: 'size-4',
    md: 'size-6',
    lg: 'size-8',
    xl: 'size-12',
  }

  const isVariant = typeof size === 'string' && size in sizeClasses
  const sizeClass = isVariant ? sizeClasses[size as string] : (size ? undefined : 'size-4')

  // If it's a variant, we don't pass size to Lucide (it's handled by class).
  // If it's not a variant, we pass it to Lucide (if it's a valid prop for it).
  // However, we are typing props as React.ComponentProps<'svg'> which doesn't have size.
  // We need to cast or use LucideProps.

  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn('animate-spin', sizeClass, className)}
      {...props as any}
      size={!isVariant ? size : undefined}
    />
  )
}

export { Spinner }
