<script setup lang="ts">
import { lang } from '../composables/useLang'
import { site } from '../data/site'
import T from './T.vue'
</script>

<template>
  <footer class="footer">
    <div class="container">
      <div class="footer__grid">
        <div class="footer__brand">
          <a class="brand" href="/"><span class="mark" aria-hidden="true"></span><span>devlog</span></a>
          <p>
            <T :zh="site.footer.note.zh" :en="site.footer.note.en" />
          </p>
        </div>
        <div>
          <h4><T zh="导航" en="Navigate" /></h4>
          <ul>
            <li><a href="/#latest"><T zh="最新" en="Latest" /></a></li>
            <li><a href="/#archive"><T zh="往期记录" en="Archive" /></a></li>
            <li><a href="/playground/"><T zh="摸鱼一下" en="Play" /></a></li>
            <li><a href="/#about"><T zh="关于" en="About" /></a></li>
          </ul>
        </div>
      </div>
      <div class="footer__bottom">
        <span>
          <T :zh="site.footer.copy.zh" :en="site.footer.copy.en" />
        </span>
        <span class="mono">
          <T :zh="site.footer.deployed.zh" :en="site.footer.deployed.en" />
        </span>
      </div>
    </div>
  </footer>
</template>
