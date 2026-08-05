import type { Component } from 'vue'

export interface Game {
  id: string
  title: { zh: string; en: string }
  desc: { zh: string; en: string }
  featured?: boolean
  component: () => Promise<{ default: Component }>
}

export const games: Game[] = [
  {
    id: 'dino',
    title: { zh: '小恐龙跑酷', en: 'Dino Run' },
    desc: { zh: '读累了？让小恐龙替你跑一会儿。', en: 'Tired of reading? Let the dino run a while.' },
    featured: true,
    component: () => import('../components/games/DinoRun.vue'),
  },
]
