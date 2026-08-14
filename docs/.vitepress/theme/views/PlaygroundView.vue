<script setup lang="ts">
import { ref, computed, defineAsyncComponent, onMounted, onUnmounted } from 'vue'
import { games } from '../data/games'
import { lang } from '../composables/useLang'
import T from '../components/T.vue'

const selected = ref<string | null>(null)
const current = computed(() => games.find((g) => g.id === selected.value) ?? null)

const asyncComponents = Object.fromEntries(
  games.map((g) => [g.id, defineAsyncComponent(g.component)]),
)

// —— 全屏：对整个游戏容器（标题 + 画布 + 提示）启用，三个游戏通用 ——
const gameBox = ref<HTMLElement | null>(null)
const isFs = ref(false)
// iPhone Safari 不支持元素全屏，能力检测失败时隐藏按钮
const canFs =
  typeof document !== 'undefined' &&
  !!(document.documentElement.requestFullscreen || (document.documentElement as any).webkitRequestFullscreen)

function syncFsState() {
  isFs.value = !!(document.fullscreenElement || (document as any).webkitFullscreenElement)
}

async function toggleFs() {
  const el = gameBox.value
  if (!el) return
  const doc = document as any
  try {
    if (isFs.value) {
      await (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.())
    } else {
      await (el.requestFullscreen?.() ?? (el as any).webkitRequestFullscreen?.())
    }
  } catch (err) {
    // 全屏失败不能静默吞掉（如浏览器策略拦截），至少暴露到控制台
    console.error('[fullscreen] request failed:', err)
  }
}

onMounted(() => {
  document.addEventListener('fullscreenchange', syncFsState)
  document.addEventListener('webkitfullscreenchange', syncFsState)
})
onUnmounted(() => {
  document.removeEventListener('fullscreenchange', syncFsState)
  document.removeEventListener('webkitfullscreenchange', syncFsState)
  // 视图卸载时若仍处于全屏，交还浏览器（元素移除后多数浏览器会自动退出，此处兜底）
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
})
</script>

<template>
  <section class="section">
    <div class="container">
      <div class="sec-head" v-reveal>
        <h2><T zh="摸鱼一下" en="Take a break" /></h2>
        <span class="count">{{ games.length }}</span>
      </div>

      <template v-if="!current">
        <div class="archive" v-reveal>
          <article
            v-for="g in games"
            :key="g.id"
            class="card"
            style="cursor: pointer"
            @click="selected = g.id"
            @keydown.enter="selected = g.id"
            tabindex="0"
          >
            <div class="card__top">
              <span class="card__meta"><span class="cat">game</span></span>
              <span class="card__idx">{{ g.id }}</span>
            </div>
            <h3>{{ lang === 'zh' ? g.title.zh : g.title.en }}</h3>
            <p class="card__excerpt">{{ lang === 'zh' ? g.desc.zh : g.desc.en }}</p>
          </article>
        </div>
      </template>

      <template v-else>
        <div ref="gameBox" class="game" v-reveal>
          <div class="game__head">
            <div>
              <span class="eyebrow"><T zh="小游戏" en="Mini game" /></span>
              <h2 style="margin-top: 12px">
                {{ lang === 'zh' ? current.title.zh : current.title.en }}
              </h2>
            </div>
            <div class="game__actions">
              <button v-if="canFs" class="btn" @click="toggleFs">
                <T v-if="isFs" zh="退出全屏" en="Exit fullscreen" />
                <T v-else zh="全屏" en="Fullscreen" />
              </button>
              <button class="btn" @click="selected = null"><T zh="返回列表" en="Back to list" /></button>
            </div>
          </div>
          <component :is="asyncComponents[current.id]" />
        </div>
      </template>
    </div>
  </section>
</template>
