import BrandLoader from '@/components/ui/BrandLoader'

/* Root loading boundary — the fallback for any segment that does not
   define its own. Light lockup on white, matching the app shell. */
export default function Loading() {
  return <BrandLoader variant="light" />
}
