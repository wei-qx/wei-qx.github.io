<script setup lang="ts">
import { lang } from '../composables/useLang'
defineProps<{ zh: string; en: string }>()
</script>

<template>
  <span>{{ lang === 'zh' ? zh : en }}</span>
</template>
