<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue'
import { games } from '../data/games'
import { lang } from '../composables/useLang'
import T from '../components/T.vue'

const selected = ref<string | null>(null)
const current = computed(() => games.find((g) => g.id === selected.value) ?? null)

const asyncComponents = Object.fromEntries(
  games.map((g) => [g.id, defineAsyncComponent(g.component)]),
)
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
        <div class="game" v-reveal>
          <div class="game__head">
            <div>
              <span class="eyebrow"><T zh="小游戏" en="Mini game" /></span>
              <h2 style="margin-top: 12px">
                {{ lang === 'zh' ? current.title.zh : current.title.en }}
              </h2>
            </div>
            <button class="btn" @click="selected = null"><T zh="返回列表" en="Back to list" /></button>
          </div>
          <component :is="asyncComponents[current.id]" />
        </div>
      </template>
    </div>
  </section>
</template>
