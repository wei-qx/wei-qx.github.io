<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const canvasEl = ref<HTMLCanvasElement | null>(null)
const overlayEl = ref<HTMLDivElement | null>(null)
const stateTitle = ref('Press space to start')
const stateSub = ref('Arrows / WASD / swipe to steer')
const scoreText = ref('0')
const bestText = ref('0')
const isOver = ref(false)
const isReady = ref(true)

let cleanup = () => {}

// `start` 需要能从模板（"Play again" 按钮）触达，
// 实际逻辑在 onMounted 中赋给 `_start`，挂载前是安全空操作。
let _start = () => {}
function start() {
  _start()
}

onMounted(() => {
  const canvas = canvasEl.value
  const overlay = overlayEl.value
  if (!canvas || !canvas.getContext || !overlay) return
  const ctx = canvas.getContext('2d')!

  const COLS = 24
  const ROWS = 14
  const CELL = 32
  const W = COLS * CELL
  const H = ROWS * CELL
  const DPR = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = W * DPR
  canvas.height = H * DPR
  ctx.scale(DPR, DPR)

  // 从主题 CSS 变量取色，与站点外观保持一致
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

  type Pt = { x: number; y: number }
  type Dir = 'up' | 'down' | 'left' | 'right'
  const DIRS: Record<Dir, Pt> = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  }
  const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }

  let state: 'ready' | 'play' | 'over' = 'ready'
  let snake: Pt[] = []
  let dir: Dir = 'right'
  let queued: Dir[] = [] // 输入缓冲，避免快速连按两次导致原地掉头
  let food: Pt = { x: 0, y: 0 }
  let score = 0
  let stepMs = 150 // 每步间隔（毫秒），随分数加快
  let hi = 0
  try {
    hi = parseInt(localStorage.getItem('devlog-snake-hi') || '0', 10) || 0
  } catch {
    hi = 0
  }
  bestText.value = String(hi)

  function spawnFood() {
    // 只在空格子里放食物，避免出现在蛇身上
    const free: Pt[] = []
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y })
      }
    }
    food = free[Math.floor(Math.random() * free.length)] ?? { x: 0, y: 0 }
  }

  function syncOverlay() {
    overlay.style.display = state === 'play' ? 'none' : ''
    isReady.value = state === 'ready'
    isOver.value = state === 'over'
  }

  function reset() {
    snake = [
      { x: 8, y: Math.floor(ROWS / 2) },
      { x: 7, y: Math.floor(ROWS / 2) },
      { x: 6, y: Math.floor(ROWS / 2) },
    ]
    dir = 'right'
    queued = []
    score = 0
    stepMs = 150
    scoreText.value = '0'
    spawnFood()
  }
  _start = function () {
    reset()
    state = 'play'
    stepAcc = 0
    syncOverlay()
  }

  function gameOver() {
    state = 'over'
    if (score > hi) {
      hi = score
      try {
        localStorage.setItem('devlog-snake-hi', String(hi))
      } catch {
        /* ignore */
      }
    }
    bestText.value = String(hi)
    stateTitle.value = 'Game Over'
    stateSub.value = `Score ${score} · Best ${hi}`
    syncOverlay()
  }

  function turn(next: Dir) {
    if (state !== 'play') return
    const last = queued.length ? queued[queued.length - 1] : dir
    if (next === last || next === OPPOSITE[last]) return
    if (queued.length < 2) queued.push(next)
  }

  function step() {
    if (queued.length) dir = queued.shift()!
    const d = DIRS[dir]
    const head = { x: snake[0].x + d.x, y: snake[0].y + d.y }

    // 撞墙或撞到自己即结束
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return gameOver()
    if (snake.some((s) => s.x === head.x && s.y === head.y)) return gameOver()

    snake.unshift(head)
    if (head.x === food.x && head.y === food.y) {
      score++
      scoreText.value = String(score)
      stepMs = Math.max(70, 150 - score * 3)
      spawnFood()
    } else {
      snake.pop()
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

  // 棋盘格底纹，让网格可感知但不喧宾夺主
  function drawBoard() {
    ctx.fillStyle = C.border
    ctx.globalAlpha = 0.35
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if ((x + y) % 2 === 0) ctx.fillRect(x * CELL, y * CELL, CELL, CELL)
      }
    }
    ctx.globalAlpha = 1
  }

  function drawSnake() {
    const pad = 3
    for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i]
      // 头部用主前景色，身体逐节淡出，尾巴更收敛
      ctx.fillStyle = i === 0 ? C.fg : C.fg2 || C.fg
      ctx.globalAlpha = i === 0 ? 1 : Math.max(0.35, 1 - i / (snake.length + 4))
      rr(s.x * CELL + pad, s.y * CELL + pad, CELL - pad * 2, CELL - pad * 2, 7)
    }
    ctx.globalAlpha = 1
    // 眼睛
    const h = snake[0]
    ctx.fillStyle = C.warm
    const ex = h.x * CELL + CELL / 2
    const ey = h.y * CELL + CELL / 2
    const d = DIRS[dir]
    ctx.fillRect(ex + d.x * 4 - (d.y ? 4 : 1) - 1, ey + d.y * 4 - (d.x ? 4 : 1) - 1, 3, 3)
    ctx.fillRect(ex + d.x * 4 + (d.y ? 4 : 1) - 1, ey + d.y * 4 + (d.x ? 4 : 1) - 1, 3, 3)
  }

  function drawFood(t: number) {
    const pulse = 1 + Math.sin(t / 240) * 0.08
    const cx = food.x * CELL + CELL / 2
    const cy = food.y * CELL + CELL / 2
    ctx.fillStyle = C.accent
    ctx.beginPath()
    ctx.arc(cx, cy, (CELL / 2 - 6) * pulse, 0, Math.PI * 2)
    ctx.fill()
  }

  function draw(t: number) {
    ctx.clearRect(0, 0, W, H)
    drawBoard()
    drawFood(t)
    drawSnake()
  }

  syncOverlay()

  // ready 状态就要画出蛇：不先 reset 的话 snake 为空，
  // drawSnake 访问 snake[0] 会在第一帧抛错并杀死整个 rAF 循环
  reset()

  let last = 0
  let stepAcc = 0
  let raf = 0
  function loop(now: number) {
    if (!last) last = now
    let dt = now - last
    last = now
    if (dt > 120) dt = 120
    if (state === 'play') {
      stepAcc += dt
      while (stepAcc >= stepMs) {
        step()
        stepAcc -= stepMs
      }
    }
    draw(now)
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  // 页面滚出视口时暂停键盘响应，避免干扰阅读
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
    const map: Record<string, Dir> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      KeyW: 'up',
      KeyS: 'down',
      KeyA: 'left',
      KeyD: 'right',
    }
    if (e.code === 'Space') {
      e.preventDefault()
      if (state !== 'play') start()
      return
    }
    const d = map[e.code]
    if (!d) return
    e.preventDefault()
    if (state !== 'play') start()
    turn(d)
  }

  // 移动端：滑动手势转向，轻点开始
  let touchX = 0
  let touchY = 0
  function onTouchStart(e: TouchEvent) {
    const t = e.touches[0]
    touchX = t.clientX
    touchY = t.clientY
  }
  function onTouchMove(e: TouchEvent) {
    e.preventDefault()
    if (state !== 'play') return
    const t = e.touches[0]
    const dx = t.clientX - touchX
    const dy = t.clientY - touchY
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return
    const d: Dir =
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
    turn(d)
    touchX = t.clientX
    touchY = t.clientY
  }
  function onTouchEnd(e: TouchEvent) {
    if (state !== 'play') start()
    e.preventDefault()
  }

  // 点击/轻点遮罩开始或重开（遮罩可见时覆盖画布，拦截指针事件，
  // 画布上的 touch 监听收不到），按钮点击冒泡时跳过避免二次触发
  function onOverlayClick(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-restart]')) return
    if (state !== 'play') start()
  }

  document.addEventListener('keydown', onKey)
  overlay.addEventListener('click', onOverlayClick)
  canvas.addEventListener('touchstart', onTouchStart, { passive: false })
  canvas.addEventListener('touchmove', onTouchMove, { passive: false })
  canvas.addEventListener('touchend', onTouchEnd, { passive: false })

  cleanup = () => {
    cancelAnimationFrame(raf)
    document.removeEventListener('keydown', onKey)
    overlay.removeEventListener('click', onOverlayClick)
    canvas.removeEventListener('touchstart', onTouchStart)
    canvas.removeEventListener('touchmove', onTouchMove)
    canvas.removeEventListener('touchend', onTouchEnd)
    gIO?.disconnect()
  }
})

onUnmounted(() => cleanup())
</script>

<template>
  <div>
    <div class="game__stage">
      <canvas ref="canvasEl" width="1536" height="896" role="img" aria-label="Snake game"></canvas>
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
            Play again
          </button>
        </template>
      </div>
    </div>
    <div class="game__hint">
      <span>Score <b>{{ scoreText }}</b> · Best <b>{{ bestText }}</b></span>
      <span><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> / <kbd>WASD</kbd> steer</span>
      <span><kbd style="cursor: pointer">swipe</kbd> on mobile</span>
      <span>Eat the dots — each one makes you faster.</span>
    </div>
  </div>
</template>
