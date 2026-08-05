import { defineConfig } from 'vitepress'

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23f3faf4'/%3E%3Crect x='7' y='7' width='18' height='18' rx='5' fill='%231f8f46'/%3E%3C/svg%3E"

export default defineConfig({
  lang: 'zh-CN',
  title: 'devlog',
  description: '一名工程师的个人记录：工程笔记、阅读摘抄与日常思考。',
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['meta', { name: 'color-scheme', content: 'light' }],
    ['meta', { name: 'theme-color', content: '#f3faf4' }],
    ['link', { rel: 'icon', href: FAVICON }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300..700&display=swap',
      },
    ],
  ],
})
