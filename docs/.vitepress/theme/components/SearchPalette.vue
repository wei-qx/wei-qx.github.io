<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vitepress'
import { lang } from '../composables/useLang'
import { searchOpen, openSearch, closeSearch } from '../composables/useSearch'
import { usePosts, type Post } from '../composables/usePosts'
import T from './T.vue'

const router = useRouter()
const posts = usePosts()
const query = ref('')
const activeIndex = ref(-1)
const inputEl = ref<HTMLInputElement | null>(null)
const listEl = ref<HTMLUListElement | null>(null)

const results = computed<Post[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return posts
  return posts.filter((p) =>
    (p.title + ' ' + p.excerpt + ' ' + p.tags.join(' ')).toLowerCase().includes(q),
  )
})

watch(results, (r) => {
  activeIndex.value = r.length ? 0 : -1
})

function metaOf(p: Post) {
  const unit = lang.value === 'zh' ? '分钟' : 'min'
  return `${p.date} · ${p.readingMinutes} ${unit} · ${p.category}`
}

async function focusInput() {
  await nextTick()
  inputEl.value?.focus()
}

function open() {
  query.value = ''
  activeIndex.value = results.value.length ? 0 : -1
  if (typeof document !== 'undefined') document.body.style.overflow = 'hidden'
  focusInput()
}

function close() {
  if (typeof document !== 'undefined') document.body.style.overflow = ''
  closeSearch()
}

function go(url: string) {
  close()
  router.go(url)
}

function setActive(i: number) {
  const rows = results.value
  if (!rows.length) return
  let n = i
  if (n < 0) n = rows.length - 1
  if (n >= rows.length) n = 0
  activeIndex.value = n
  const el = listEl.value?.querySelector<HTMLElement>(`li.res:nth-child(${n + 1})`)
  el?.scrollIntoView({ block: 'nearest' })
}

function onKeydown(e: KeyboardEvent) {
  if (!searchOpen.value) {
    const tag = (document.activeElement as HTMLElement | null)?.tagName ?? ''
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      openSearch()
    } else if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(tag)) {
      e.preventDefault()
      openSearch()
    }
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    setActive(activeIndex.value + 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    setActive(activeIndex.value - 1)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const r = results.value[activeIndex.value]
    if (r) go(r.url)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
}

watch(searchOpen, (v) => {
  if (v) open()
  else if (typeof document !== 'undefined') document.body.style.overflow = ''
})

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="palette" :class="{ 'is-open': searchOpen }" role="dialog" aria-modal="true" aria-label="Search">
    <div class="palette__backdrop" @click="close"></div>
    <div class="palette__panel">
      <div class="palette__input-row">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
        <input
          ref="inputEl"
          v-model="query"
          type="text"
          autocomplete="off"
          :placeholder="lang === 'zh' ? '搜索文章…' : 'Search notes…'"
        />
      </div>
      <ul ref="listEl" class="palette__list">
        <li
          v-for="(p, i) in results"
          :key="p.url"
          class="res"
          :class="{ active: i === activeIndex }"
        >
          <button @click="go(p.url)">
            <span class="res-title">{{ p.title }}</span>
            <span class="res-meta">{{ metaOf(p) }}</span>
          </button>
        </li>
        <li v-if="!results.length" class="empty">
          <T zh="没有匹配的记录。" en="No matching notes." />
        </li>
      </ul>
      <div class="palette__hint">
        <span><kbd>↑</kbd><kbd>↓</kbd> <T zh="选择" en="navigate" /></span>
        <span><kbd>↵</kbd> <T zh="打开" en="open" /></span>
        <span><kbd>esc</kbd> <T zh="关闭" en="close" /></span>
      </div>
    </div>
  </div>
</template>
