import type { Directive } from 'vue'

type IO = IntersectionObserver | null
const observer: IO =
  typeof window !== 'undefined' && 'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible')
              observer?.unobserve(entry.target)
            }
          }
        },
        { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
      )
    : null

/** Add `v-reveal` to any element; it gains the `data-reveal` attribute on
 *  mount (client-only, so SSR/SEO content is never hidden) and reveals when
 *  scrolled into view. No-JS fallback: content is visible by default. */
export const reveal: Directive<HTMLElement> = {
  mounted(el) {
    el.setAttribute('data-reveal', '')
    if (observer) observer.observe(el)
    else el.classList.add('is-visible')
  },
  unmounted(el) {
    observer?.unobserve(el)
  },
}
