<script setup lang="ts">
import { onMounted } from 'vue'
import { useData } from 'vitepress'
import { initLang } from './composables/useLang'
import SiteNav from './components/SiteNav.vue'
import SiteFooter from './components/SiteFooter.vue'
import ReadingProgress from './components/ReadingProgress.vue'
import SearchPalette from './components/SearchPalette.vue'
import ArticleHeader from './components/ArticleHeader.vue'
import HomeView from './views/HomeView.vue'
import PlaygroundView from './views/PlaygroundView.vue'

const { frontmatter } = useData()

onMounted(() => initLang())
</script>

<template>
  <ReadingProgress />
  <SiteNav />
  <main>
    <HomeView v-if="frontmatter.layout === 'home'" />
    <PlaygroundView v-else-if="frontmatter.layout === 'playground'" />
    <template v-else>
      <ArticleHeader v-if="frontmatter.title" />
      <div class="article-body">
        <Content />
      </div>
    </template>
  </main>
  <SiteFooter />
  <SearchPalette />
</template>
