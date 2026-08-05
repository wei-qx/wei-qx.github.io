<script setup lang="ts">
import { ref, computed, defineAsyncComponent, onMounted } from 'vue'
import { lang } from '../composables/useLang'
import { site } from '../data/site'
import { games } from '../data/games'
import { usePosts, useFeaturedPost } from '../composables/usePosts'
import T from '../components/T.vue'

const featured = useFeaturedPost()
const posts = usePosts()

const archive = computed(() => (featured ? posts.filter((p) => p.url !== featured.url) : posts))

const TOPICS: { id: string; zh: string; en: string }[] = [
  { id: 'all', zh: '全部', en: 'All' },
  { id: 'systems', zh: '系统', en: 'Systems' },
  { id: 'frontend', zh: '前端', en: 'Frontend' },
  { id: 'performance', zh: '性能', en: 'Performance' },
  { id: 'craft', zh: '匠心', en: 'Craft' },
  { id: 'tooling', zh: '工具', en: 'Tooling' },
]
const topic = ref('all')
const filteredArchive = computed(() =>
  topic.value === 'all' ? archive.value : archive.value.filter((p) => p.category === topic.value),
)

const featuredGame = games.find((g) => g.featured) ?? games[0] ?? null
const FeaturedGameComponent = featuredGame ? defineAsyncComponent(featuredGame.component) : null

// Historical best score for the featured game (dino), persisted by DinoRun
// under 'devlog-dino-hi'. Read on mount (client-only) so the section header
// reflects the player's best across visits.
const best = ref(0)
onMounted(() => {
  try {
    best.value = parseInt(localStorage.getItem('devlog-dino-hi') || '0', 10) || 0
  } catch {
    best.value = 0
  }
})
</script>

<template>
  <!-- Hero -->
  <section class="hero section">
    <div class="container">
      <div class="hero__eyebrow eyebrow">
        <span><T :zh="site.hero.eyebrow.zh" :en="site.hero.eyebrow.en" /></span>
        <span class="mono"><T :zh="site.hero.mono.zh" :en="site.hero.mono.en" /></span>
      </div>
      <h1 style="transition-delay: 60ms">
        <T :zh="site.hero.title.zh" :en="site.hero.title.en" />
      </h1>
      <p class="hero__sub" style="transition-delay: 120ms">
        <T :zh="site.hero.sub.zh" :en="site.hero.sub.en" />
      </p>
      <div class="hero__meta" style="transition-delay: 180ms">
        <span><T zh="作者" en="by" /></span>
        <span><T :zh="site.hero.author.zh" :en="site.hero.author.en" /></span>
        <span class="sep">·</span>
        <time>{{ site.hero.date }}</time>
        <span class="sep">·</span>
        <a href="#about"><T zh="关于这本记录" en="About this notebook" /></a>
      </div>
    </div>
  </section>

  <!-- Latest / featured -->
  <section v-if="featured" class="section" id="latest">
    <div class="container">
      <div class="sec-head" v-reveal>
        <h2><T zh="最近写下" en="Latest" /></h2>
        <span class="count"><T zh="想到就记" en="Written as it comes" /></span>
      </div>
      <article class="feature" v-reveal>
        <div class="feature__index">{{ featured.order || '01' }}</div>
        <div>
          <div class="feature__meta">
            <time>{{ featured.date }}</time>
            <span class="sep" style="color: var(--border)">·</span>
            <span>{{ featured.readingMinutes }} <T zh="分钟阅读" en="min read" /></span>
            <span class="sep" style="color: var(--border)">·</span>
            <span class="cat">{{ featured.category }}</span>
          </div>
          <h2>{{ featured.title }}</h2>
          <p class="feature__excerpt">{{ featured.excerpt }}</p>
          <div class="feature__cta">
            <a class="btn" :href="featured.url">
              <span><T zh="继续阅读" en="Read on" /></span>
              <svg class="arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
            </a>
          </div>
        </div>
      </article>
    </div>
  </section>

  <!-- Archive -->
  <section class="section" id="archive">
    <div class="container">
      <div class="sec-head" v-reveal>
        <h2><T zh="往期记录" en="Archive" /></h2>
        <span class="count">{{ filteredArchive.length }} <T zh="篇" en="notes" /></span>
      </div>

      <div class="topics" role="tablist" v-reveal>
        <button
          v-for="t in TOPICS"
          :key="t.id"
          class="topic"
          :class="{ 'is-active': topic === t.id }"
          @click="topic = t.id"
        >
          {{ lang === 'zh' ? t.zh : t.en }}
        </button>
      </div>

      <div class="archive" v-reveal>
        <article v-for="p in filteredArchive" :key="p.url" class="card">
          <a :href="p.url" style="display: contents">
            <div class="card__top">
              <span class="card__meta">
                <time>{{ p.date }}</time> · {{ p.readingMinutes }} <T zh="分钟阅读" en="min read" /> ·
                <span class="cat">{{ p.category }}</span>
              </span>
              <span class="card__idx">{{ p.order }}</span>
            </div>
            <h3>{{ p.title }}</h3>
            <p class="card__excerpt">{{ p.excerpt }}</p>
            <div v-if="p.tags.length" class="card__tags">
              <span v-for="tag in p.tags" :key="tag" class="tag">{{ tag }}</span>
            </div>
          </a>
        </article>
      </div>
    </div>
  </section>

  <!-- Featured game -->
  <section v-if="FeaturedGameComponent" class="section" id="play">
    <div class="container">
      <div class="sec-head" v-reveal>
        <h2><T zh="摸鱼一下" en="Take a break" /></h2>
        <span class="count game__best">
          <T zh="最高分" en="Best" /> <b>{{ best }}</b>
        </span>
      </div>
      <div class="game" v-reveal>
        <div class="game__head">
          <div>
            <span class="eyebrow"><T zh="小游戏" en="Mini game" /></span>
            <h2 style="margin-top: 12px">
              {{ featuredGame ? (lang === 'zh' ? featuredGame.title.zh : featuredGame.title.en) : '' }}
            </h2>
          </div>
          <p class="mono" style="max-width: 34ch">
            {{ featuredGame ? (lang === 'zh' ? featuredGame.desc.zh : featuredGame.desc.en) : '' }}
          </p>
        </div>
        <component :is="FeaturedGameComponent" />
      </div>
    </div>
  </section>

  <!-- About -->
  <section class="section" id="about">
    <div class="container">
      <div class="sec-head" v-reveal>
        <h2><T zh="关于这本记录" en="About this notebook" /></h2>
      </div>
      <div class="about" v-reveal>
        <div class="about__body">
          <div class="eyebrow" style="margin-bottom: 20px"><span><T zh="关于" en="About" /></span></div>
          <p v-for="(line, i) in lang === 'zh' ? site.about.body.zh : site.about.body.en" :key="i">
            {{ line }}
          </p>
          <div class="about__links">
            <a class="btn" :href="site.links.github" target="_blank" rel="noopener">GitHub</a>
            <a class="btn" :href="site.links.rss"><T zh="RSS 源" en="RSS feed" /></a>
            <a class="btn" :href="site.links.email"><T zh="邮件" en="Email" /></a>
          </div>
        </div>
        <div class="about__card">
          <div class="lab"><T zh="写作原则" en="How I write" /></div>
          <p><T :zh="site.about.how.zh" :en="site.about.how.en" /></p>
        </div>
      </div>
    </div>
  </section>
</template>
