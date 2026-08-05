<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import T from './T.vue'

const { frontmatter } = useData()
const fm = frontmatter as unknown as {
  date?: string
  readingMinutes?: number
  category?: string
  title?: string
  excerpt?: string
  tags?: string[]
}
const dateStr = computed(() => {
  const d = frontmatter.value.date
  return d ? new Date(d).toISOString().slice(0, 10) : ''
})
</script>

<template>
  <header class="article-head container">
    <div class="feature__meta">
      <template v-if="dateStr"><time>{{ dateStr }}</time> · </template>
      <span>{{ fm.readingMinutes }} <T zh="分钟阅读" en="min read" /></span>
      <span class="sep" style="color: var(--border)">·</span>
      <span class="cat">{{ fm.category }}</span>
    </div>
    <h1>{{ fm.title }}</h1>
    <p v-if="fm.excerpt" class="card__excerpt">{{ fm.excerpt }}</p>
    <div v-if="fm.tags && fm.tags.length" class="card__tags">
      <span v-for="t in fm.tags" :key="t" class="tag">{{ t }}</span>
    </div>
  </header>
</template>
