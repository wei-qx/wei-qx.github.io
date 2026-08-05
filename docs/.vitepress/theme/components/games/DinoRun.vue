<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const canvasEl = ref<HTMLCanvasElement | null>(null)
const overlayEl = ref<HTMLDivElement | null>(null)
const stateTitle = ref('Press space to run')
const stateSub = ref('Space / ↑ / tap to jump')
const scoreText = ref('0')
const bestText = ref('0')
const isOver = ref(false)
const isReady = ref(true)

let cleanup = () => {}

// `start` must be reachable from the template (the "Run again" button).
// It delegates to `_start`, which is reassigned inside onMounted once the
// canvas game state exists. Before mount it is a safe no-op.
let _start = () => {}
function start() {
  _start()
}

onMounted(() => {
  const canvas = canvasEl.value
  const overlay = overlayEl.value
  if (!canvas || !canvas.getContext || !overlay) return
  const ctx = canvas.getContext('2d')!

  const W = 900
  const H = 220
  const DPR = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = W * DPR
  canvas.height = H * DPR
  ctx.scale(DPR, DPR)

  const css = getComputedStyle(document.documentElement)
  const tk = (n: string) => {
    const v = css.getPropertyValue(n)
    return v ? v.trim() : ''
  }
  const C = {
    fg: tk('--fg'),
    fg2: tk('--fg-2'),
    muted: tk('--muted'),
    accent: tk('--accent'),
    border: tk('--border'),
    warm: tk('--surface-warm'),
  }

  const GROUND_Y = H - 34
  const GRAVITY = 0.6
  const JUMP_V = -11.5
  let state: 'ready' | 'play' | 'over' = 'ready'
  let speed = 6
  let score = 0
  let frame = 0
  let spawnTimer = 0
  let nextSpawn = 80
  let legToggle = 0
  let hi = 0
  try {
    hi = parseInt(localStorage.getItem('devlog-dino-hi') || '0', 10) || 0
  } catch {
    hi = 0
  }
  bestText.value = String(hi)

  const dino = { x: 64, y: GROUND_Y - 46, w: 44, h: 46, vy: 0, onGround: true }
  let obstacles: { x: number; y: number; w: number; h: number }[] = []
  const clouds: { x: number; y: number; s: number }[] = []
  const dashes: number[] = []
  for (let i = 0; i < 3; i++)
    clouds.push({ x: Math.random() * W, y: 28 + Math.random() * 60, s: 0.4 + Math.random() * 0.5 })
  for (let gx = 0; gx < W + 40; gx += 26) dashes.push(gx)

  function syncOverlay() {
    overlay.style.display = state === 'play' ? 'none' : ''
    isReady.value = state === 'ready'
    isOver.value = state === 'over'
    if (state === 'ready') {
      stateTitle.value = 'Press space to run'
      stateSub.value = 'Space / ↑ / tap to jump'
    }
  }

  function reset() {
    speed = 6
    score = 0
    obstacles = []
    spawnTimer = 0
    nextSpawn = 80
    dino.y = GROUND_Y - dino.h
    dino.vy = 0
    dino.onGround = true
  }
  _start = function () {
    reset()
    state = 'play'
    syncOverlay()
  }
  function gameOver() {
    state = 'over'
    if (score > hi) {
      hi = score
      try {
        localStorage.setItem('devlog-dino-hi', String(hi))
      } catch {
        /* ignore */
      }
    }
    scoreText.value = String(score)
    bestText.value = String(hi)
    stateTitle.value = 'Game Over'
    stateSub.value = `Score ${score} · Best ${hi}`
    syncOverlay()
  }

  function jump() {
    if (state === 'ready' || state === 'over') return _start()
    if (state === 'play' && dino.onGround) {
      dino.vy = JUMP_V
      dino.onGround = false
    }
  }

  function spawnObstacle() {
    const big = Math.random() < 0.4
    obstacles.push({
      x: W + 12,
      y: GROUND_Y - (big ? 42 + Math.random() * 8 : 28 + Math.random() * 8),
      w: big ? 26 + Math.random() * 8 : 16 + Math.random() * 6,
      h: big ? 42 + Math.random() * 8 : 28 + Math.random() * 8,
    })
    if (Math.random() < 0.22) obstacles.push({ x: W + 42, y: GROUND_Y - 24, w: 16, h: 24 })
  }
  function hit(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
    const ax = a.x + 6
    const ay = a.y + 5
    const aw = a.w - 12
    const ah = a.h - 7
    return ax < b.x + b.w && ax + aw > b.x && ay < b.y + b.h && ay + ah > b.y
  }

  function update() {
    frame++
    const cspd = state === 'play' ? 1 : 0.4
    for (let i = 0; i < clouds.length; i++) {
      clouds[i].x -= clouds[i].s * cspd * 1.4
      if (clouds[i].x < -50) clouds[i].x = W + 50
    }
    const gspd = state === 'play' ? speed : speed * 0.4
    for (let j = 0; j < dashes.length; j++) {
      dashes[j] -= gspd
      if (dashes[j] < -26) dashes[j] += W + 52
    }
    legToggle = Math.floor(frame / 6) % 2
    if (state !== 'play') return

    if (frame % 6 === 0) {
      score++
      scoreText.value = String(score)
    }
    speed = 6 + Math.min(7, score / 60)

    dino.vy += GRAVITY
    dino.y += dino.vy
    if (dino.y >= GROUND_Y - dino.h) {
      dino.y = GROUND_Y - dino.h
      dino.vy = 0
      dino.onGround = true
    }

    spawnTimer++
    if (spawnTimer >= nextSpawn) {
      spawnObstacle()
      spawnTimer = 0
      nextSpawn = Math.round(52 + Math.random() * 72)
    }

    for (let k = obstacles.length - 1; k >= 0; k--) {
      obstacles[k].x -= speed
      if (obstacles[k].x + obstacles[k].w < -12) obstacles.splice(k, 1)
      else if (hit(dino, obstacles[k])) {
        gameOver()
        return
      }
    }
  }

  function rr(x: number, y: number, w: number, h: number, r: number) {
    r = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
    ctx.fill()
  }
  function drawDino(x: number, y: number) {
    ctx.fillStyle = C.fg
    rr(x, y + 24, 13, 9, 3)
    rr(x + 8, y + 16, 25, 21, 9)
    rr(x + 23, y + 3, 20, 19, 7)
    rr(x + 30, y + 25, 6, 4, 2)
    const ly = y + 37
    if (dino.onGround) {
      if (legToggle) {
        rr(x + 13, ly, 6, 9, 2)
        rr(x + 25, ly, 6, 5, 2)
      } else {
        rr(x + 13, ly, 6, 5, 2)
        rr(x + 25, ly, 6, 9, 2)
      }
    } else {
      rr(x + 15, ly, 6, 6, 2)
      rr(x + 24, ly, 6, 6, 2)
    }
    ctx.fillStyle = C.warm
    ctx.fillRect(x + 35, y + 8, 3, 3)
  }
  function drawCactus(o: { x: number; y: number; w: number; h: number }) {
    ctx.fillStyle = C.accent
    const mw = Math.max(5, Math.round(o.w * 0.34))
    rr(o.x + (o.w - mw) / 2, o.y, mw, o.h, 3)
    rr(o.x, o.y + o.h * 0.4, o.w * 0.5, Math.max(4, mw * 0.8), 2)
    rr(o.x, o.y + o.h * 0.18, Math.max(4, mw * 0.8), o.h * 0.26, 2)
    rr(o.x + o.w * 0.5, o.y + o.h * 0.52, o.w * 0.5, Math.max(4, mw * 0.8), 2)
    rr(o.x + o.w - Math.max(4, mw * 0.8), o.y + o.h * 0.26, Math.max(4, mw * 0.8), o.h * 0.3, 2)
  }
  function drawCloud(c: { x: number; y: number; s: number }) {
    ctx.fillStyle = C.border
    ctx.beginPath()
    ctx.arc(c.x, c.y, 7 * c.s + 4, 0, Math.PI * 2)
    ctx.arc(c.x + 10 * c.s + 4, c.y - 4 * c.s, 9 * c.s + 4, 0, Math.PI * 2)
    ctx.arc(c.x + 21 * c.s + 4, c.y, 7 * c.s + 4, 0, Math.PI * 2)
    ctx.fill()
  }

  function draw() {
    ctx.clearRect(0, 0, W, H)
    for (const c of clouds) drawCloud(c)
    ctx.strokeStyle = C.border
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, GROUND_Y)
    ctx.lineTo(W, GROUND_Y)
    ctx.stroke()
    ctx.fillStyle = C.border
    for (const d of dashes) ctx.fillRect(d, GROUND_Y + 6, 12, 2)
    for (const o of obstacles) drawCactus(o)
    drawDino(dino.x, dino.y)
  }

  syncOverlay()

  let last = 0
  let acc = 0
  const STEP = 1000 / 60
  let raf = 0
  function loop(now: number) {
    if (!last) last = now
    let dt = now - last
    last = now
    if (dt > 120) dt = 120
    acc += dt
    let guard = 0
    while (acc >= STEP && guard < 5) {
      update()
      acc -= STEP
      guard++
    }
    draw()
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  let gameVisible = true
  let gIO: IntersectionObserver | null = null
  if ('IntersectionObserver' in window) {
    gIO = new IntersectionObserver(
      (es) => es.forEach((en) => (gameVisible = en.isIntersecting)),
      { threshold: 0.2 },
    )
    gIO.observe(canvas.parentElement as Element)
  }

  function onKey(e: KeyboardEvent) {
    if (!gameVisible) return
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault()
      jump()
    }
  }
  function onOverlayClick(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-restart]')) return
    jump()
  }
  function onCanvasTouch(e: TouchEvent) {
    e.preventDefault()
    jump()
  }

  document.addEventListener('keydown', onKey)
  overlay.addEventListener('click', onOverlayClick)
  canvas.addEventListener('touchstart', onCanvasTouch, { passive: false })

  cleanup = () => {
    cancelAnimationFrame(raf)
    document.removeEventListener('keydown', onKey)
    overlay.removeEventListener('click', onOverlayClick)
    canvas.removeEventListener('touchstart', onCanvasTouch)
    gIO?.disconnect()
  }
})

onUnmounted(() => cleanup())
</script>

<template>
  <div>
    <div class="game__stage">
      <canvas ref="canvasEl" width="1800" height="440" role="img" aria-label="Dino run game"></canvas>
      <div ref="overlayEl" class="game__overlay">
        <template v-if="!isOver">
          <div class="game__state-title">{{ stateTitle }}</div>
          <div class="game__state-sub">{{ stateSub }}</div>
        </template>
        <template v-else>
          <div class="game__state-title">Game Over</div>
          <div class="game__state-sub">
            Score <b>{{ scoreText }}</b> · Best <b>{{ bestText }}</b>
          </div>
          <button class="btn btn--primary" data-restart @click="start">
            Run again
          </button>
        </template>
      </div>
    </div>
    <div class="game__hint">
      <span><kbd>Space</kbd> / <kbd>↑</kbd> jump</span>
      <span><kbd style="cursor: pointer">tap</kbd> tap on mobile</span>
      <span>Dodge the cacti — it gets faster.</span>
    </div>
  </div>
</template>
