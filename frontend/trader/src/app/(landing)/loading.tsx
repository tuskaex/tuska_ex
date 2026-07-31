import BrandLoader from '@/components/ui/BrandLoader'

/* Light, despite the home hero being a near-black star field.
 *
 * One boundary covers the whole (landing) group, and the group is almost
 * entirely light pages — /platforms, /policy, /partners, /about. Only
 * `/` is dark. Choosing dark to suit that one route would flash black
 * before every white page in the group.
 *
 * `/` barely pays for it either way: it is statically prerendered (○ in
 * the build output), so this boundary rarely gets a chance to render
 * there at all. */
export default function Loading() {
  return <BrandLoader variant="light" />
}
