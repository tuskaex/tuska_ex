import BrandLoader from '@/components/ui/BrandLoader'

/* Light lockup: the trader app is light-only. uiStore.setTheme is hard
   wired to 'light' and rehydrate forces any persisted 'dark' back, so a
   dark loader here would flash black before a white page every time. */
export default function Loading() {
  return <BrandLoader variant="light" fullScreen={false} />
}
