<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const scale = ref(0)
let ticking = false

function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    const doc = document.documentElement
    const max = doc.scrollHeight - doc.clientHeight
    scale.value = max > 0 ? doc.scrollTop / max : 0
    ticking = false
  })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  onScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})
</script>

<template>
  <div class="progress" aria-hidden="true">
    <div class="progress__bar" :style="{ transform: `scaleX(${scale.toFixed(4)})` }"></div>
  </div>
</template>
