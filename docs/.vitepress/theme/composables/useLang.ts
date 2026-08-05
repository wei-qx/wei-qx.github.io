import { ref } from 'vue'

export type Lang = 'zh' | 'en'

const LANG_KEY = 'devlog-lang'

/** Singleton reactive language. SSR renders with the default ('zh'); the
 *  client syncs from localStorage / navigator.lang on mount via initLang(). */
export const lang = ref<Lang>('zh')

export function detectInitialLang(): Lang {
  if (typeof navigator !== 'undefined') {
    let stored: string | null = null
    try {
      stored = localStorage.getItem(LANG_KEY)
    } catch {
      stored = null
    }
    if (stored === 'zh' || stored === 'en') return stored
    return (navigator.language || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en'
  }
  return 'zh'
}

export function setLang(l: Lang) {
  lang.value = l
  try {
    localStorage.setItem(LANG_KEY, l)
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en'
  }
}

export function toggleLang() {
  setLang(lang.value === 'zh' ? 'en' : 'zh')
}

/** Call once in Layout.onMounted to hydrate the persisted choice. */
export function initLang() {
  setLang(detectInitialLang())
}
