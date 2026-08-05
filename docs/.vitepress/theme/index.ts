import type { Theme } from 'vitepress'
import Layout from './Layout.vue'
import { reveal } from './composables/useReveal'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'

export default {
  Layout,
  enhanceApp({ app }) {
    app.directive('reveal', reveal)
  },
} satisfies Theme
