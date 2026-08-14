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
  {
    id: 'snake',
    title: { zh: '贪吃蛇', en: 'Snake' },
    desc: { zh: '吃得越多跑得越快，别咬到自己。', en: 'Each bite makes you faster. Don\'t bite yourself.' },
    component: () => import('../components/games/Snake.vue'),
  },
  {
    id: '2048',
    title: { zh: '2048', en: '2048' },
    desc: { zh: '同数相撞即合并，凑出 2048。', en: 'Slide and merge same numbers to reach 2048.' },
    featured: true,
    component: () => import('../components/games/G2048.vue'),
  },
  {
    id: 'asteroids',
    title: { zh: '小行星', en: 'Asteroids' },
    desc: { zh: '开着线框飞船，把大石头打成小石头。', en: 'Pilot a wireframe ship and shatter rocks into pieces.' },
    component: () => import('../components/games/Asteroids.vue'),
  },
  {
    id: 'frogger',
    title: { zh: '过马路', en: 'Cross the Road' },
    desc: { zh: '一格一格跳过车流，到对岸就升级。', en: 'Hop across traffic lane by lane. Level up at the far side.' },
    component: () => import('../components/games/Frogger.vue'),
  },
]
