<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { lang, toggleLang } from '../composables/useLang'
import { openSearch } from '../composables/useSearch'
import T from './T.vue'

const scrolled = ref(false)
let ticking = false

function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    scrolled.value = window.scrollY > 8
    ticking = false
  })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <header class="nav" :class="{ scrolled }">
    <div class="container nav__inner">
      <a class="brand" href="/">
        <span class="mark" aria-hidden="true"></span>
        <span>devlog</span>
        <span class="ver">v0</span>
      </a>
      <nav class="nav__links" aria-label="Primary">
        <a href="/#latest"><T zh="最新" en="Latest" /></a>
        <a href="/#archive"><T zh="往期" en="Archive" /></a>
        <a href="/playground/"><T zh="摸鱼" en="Play" /></a>
        <a href="/#about"><T zh="关于" en="About" /></a>
      </nav>
      <div class="nav__spacer"></div>
      <div class="nav__actions">
        <button class="search-trigger" @click="openSearch" aria-label="Search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
          <span><T zh="搜索" en="Search" /></span>
          <kbd>⌘K</kbd>
        </button>
        <button class="lang-toggle" @click="toggleLang" aria-label="Switch language">
          <span>{{ lang === 'zh' ? 'EN' : '中' }}</span>
        </button>
      </div>
    </div>
  </header>
</template>
