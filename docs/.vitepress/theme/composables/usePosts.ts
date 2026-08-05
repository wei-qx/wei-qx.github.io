export type Category = 'systems' | 'frontend' | 'performance' | 'craft' | 'tooling'

export interface Post {
  url: string
  title: string
  date: string
  category: string
  excerpt: string
  tags: string[]
  readingMinutes: number
  featured: boolean
  order: string
  draft: boolean
}

interface PageDataLike {
  frontmatter: Record<string, any>
  relativePath: string
}

const glob = import.meta.glob<{ __pageData: PageDataLike }>('../../../posts/*.md', {
  eager: true,
})

function toUrl(relativePath: string): string {
  return '/' + relativePath.replace(/\.md$/, '').replace(/\/index$/, '/')
}

function toPost(mod: { __pageData: PageDataLike }): Post {
  const fm = mod.__pageData.frontmatter
  return {
    url: toUrl(mod.__pageData.relativePath),
    title: fm.title ?? mod.__pageData.relativePath,
    date: fm.date ? new Date(fm.date).toISOString().slice(0, 10) : '',
    category: fm.category ?? 'craft',
    excerpt: fm.excerpt ?? '',
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    readingMinutes: fm.readingMinutes ?? 0,
    featured: fm.featured === true,
    order: fm.order != null ? String(fm.order).padStart(2, '0') : '',
    draft: fm.draft === true,
  }
}

const all: Post[] = Object.values(glob)
  .map(toPost)
  .filter((p) => !p.draft || import.meta.env.DEV)
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

let cache: Post[] | null = null

/** Build-time post collection, newest first. Drafts visible only in dev. */
export function usePosts(): Post[] {
  if (!cache) cache = all
  return cache
}

export function useFeaturedPost(): Post | null {
  const posts = usePosts()
  const featured = posts.filter((p) => p.featured)
  return featured[0] ?? posts[0] ?? null
}
