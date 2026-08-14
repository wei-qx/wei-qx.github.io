<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const canvasEl = ref<HTMLCanvasElement | null>(null)
const overlayEl = ref<HTMLDivElement | null>(null)
const scoreText = ref('0')
const bestText = ref('0')
const isOver = ref(false)
const isWon = ref(false)
const isReady = ref(true)

let cleanup = () => {}

// `start` 需要能从模板（重开按钮）触达，
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

  const SIZE = 4
  const CELL = 104
  const GAP = 12
  const PAD = 12
  const W = PAD * 2 + CELL * SIZE + GAP * (SIZE - 1)
  const H = W
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
    muted: tk('--muted'),
    accent: tk('--accent'),
    border: tk('--border'),
    warm: tk('--surface-warm'),
  }
  const FONT = css.getPropertyValue('--font-mono')?.trim() || 'monospace'

  type Dir = 'up' | 'down' | 'left' | 'right'
  const DIRS: Record<Dir, { x: number; y: number }> = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  }

  // tile 的 x/y 是目标格坐标，fromX/fromY 是本次移动的起点（用于滑动动画）
  type Tile = {
    id: number
    value: number
    x: number
    y: number
    fromX: number
    fromY: number
    merged: boolean
    born: number
  }

  let state: 'ready' | 'play' | 'over' | 'won' = 'ready'
  let grid: (Tile | null)[][] = []
  let tiles: Tile[] = []
  let nextId = 1
  let score = 0
  let moveTime = 0
  let wonShown = false
  let hi = 0
  try {
    hi = parseInt(localStorage.getItem('devlog-2048-hi') || '0', 10) || 0
  } catch {
    hi = 0
  }
  bestText.value = String(hi)

  function syncOverlay() {
    overlay.style.display = state === 'play' ? 'none' : ''
    isReady.value = state === 'ready'
    isOver.value = state === 'over'
    isWon.value = state === 'won'
  }

  function emptyCells() {
    const free: { x: number; y: number }[] = []
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) if (!grid[y][x]) free.push({ x, y })
    return free
  }

  function spawn() {
    const free = emptyCells()
    if (!free.length) return
    const c = free[Math.floor(Math.random() * free.length)]
    const t: Tile = {
      id: nextId++,
      value: Math.random() < 0.9 ? 2 : 4,
      x: c.x,
      y: c.y,
      fromX: c.x,
      fromY: c.y,
      merged: false,
      born: performance.now(),
    }
    grid[c.y][c.x] = t
    tiles.push(t)
  }

  function reset() {
    grid = Array.from({ length: SIZE }, () => Array<Tile | null>(SIZE).fill(null))
    tiles = []
    score = 0
    wonShown = false
    scoreText.value = '0'
    spawn()
    spawn()
  }
  _start = function () {
    reset()
    state = 'play'
    syncOverlay()
  }

  function persistBest() {
    if (score > hi) {
      hi = score
      try {
        localStorage.setItem('devlog-2048-hi', String(hi))
      } catch {
        /* ignore */
      }
      bestText.value = String(hi)
    }
  }

  function canMove() {
    if (tiles.length < SIZE * SIZE) return true
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const v = grid[y][x]!.value
        if (x < SIZE - 1 && grid[y][x + 1]!.value === v) return true
        if (y < SIZE - 1 && grid[y + 1][x]!.value === v) return true
      }
    return false
  }

  function doMove(d: Dir): boolean {
    const v = DIRS[d]
    // 从移动方向的前端开始遍历，保证依次靠拢（必须覆盖全部 0-3 索引）
    const xs = v.x > 0 ? [3, 2, 1, 0] : [0, 1, 2, 3]
    const ys = v.y > 0 ? [3, 2, 1, 0] : [0, 1, 2, 3]
    for (const t of tiles) t.merged = false
    let moved = false

    for (const y of ys) {
      for (const x of xs) {
        const tile = grid[y][x]
        if (!tile) continue
        // 沿方向滑到最远的空格
        let cx = x
        let cy = y
        while (true) {
          const nx = cx + v.x
          const ny = cy + v.y
          if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE || grid[ny][nx]) break
          cx = nx
          cy = ny
        }
        const nx = cx + v.x
        const ny = cy + v.y
        const next =
          nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE ? grid[ny][nx] : null
        // 前方是同值且本轮未合并过的块 → 合并
        if (next && next.value === tile.value && !next.merged) {
          grid[y][x] = null
          tiles = tiles.filter((t) => t !== next)
          tile.fromX = x
          tile.fromY = y
          tile.x = nx
          tile.y = ny
          tile.value *= 2
          tile.merged = true
          grid[ny][nx] = tile
          score += tile.value
          scoreText.value = String(score)
          moved = true
        } else if (cx !== x || cy !== y) {
          grid[y][x] = null
          grid[cy][cx] = tile
          tile.fromX = x
          tile.fromY = y
          tile.x = cx
          tile.y = cy
          moved = true
        }
      }
  }
    return moved
  }

  function move(d: Dir) {
    if (state !== 'play') return
    if (!doMove(d)) return
    moveTime = performance.now()
    spawn()
    persistBest()
    if (!wonShown && tiles.some((t) => t.value >= 2048)) {
      wonShown = true
      state = 'won'
      syncOverlay()
    } else if (!canMove()) {
      state = 'over'
      persistBest()
      syncOverlay()
    }
  }

  function continuePlay() {
    if (state !== 'won') return
    state = 'play'
    syncOverlay()
  }
  _keep = continuePlay

  // —— 绘制 ——

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

  const cellXY = (gx: number, gy: number) => ({
    px: PAD + gx * (CELL + GAP),
    py: PAD + gy * (CELL + GAP),
  })

  // 数值越大色块越实，高值块换强调色；文字在深底上用前景色、浅底上用暖色
  function tileStyle(value: number) {
    const e = Math.log2(value) // 2→1 … 2048→11
    const useAccent = value >= 128
    const alpha = useAccent
      ? Math.min(0.4 + e * 0.055, 0.95)
      : Math.min(0.1 + e * 0.08, 0.55)
    return {
      fill: useAccent ? C.accent : C.fg,
      alpha,
      text: alpha > 0.55 ? C.warm : C.fg,
    }
  }

  function drawTile(tile: Tile, now: number, slideT: number) {
    const ease = 1 - Math.pow(1 - slideT, 3) // easeOutCubic
    const { px, py } = cellXY(
      tile.fromX + (tile.x - tile.fromX) * ease,
      tile.fromY + (tile.y - tile.fromY) * ease,
    )
    // 新块缩放进场，合并块轻微弹跳
    let scale = 1
    const bornT = Math.min(1, (now - tile.born) / 150)
    if (bornT < 1) scale *= 0.3 + 0.7 * bornT
    if (tile.merged && slideT < 1) scale *= 1 + 0.18 * Math.sin(Math.PI * slideT)

    const st = tileStyle(tile.value)
    ctx.globalAlpha = st.alpha
    ctx.fillStyle = st.fill
    const inset = (CELL * (1 - scale)) / 2
    rr(px + inset, py + inset, CELL * scale, CELL * scale, 10)

    ctx.globalAlpha = 1
    if (scale > 0.6) {
      const digits = String(tile.value).length
      const fs = digits <= 2 ? 42 : digits === 3 ? 36 : digits === 4 ? 30 : 24
      ctx.fillStyle = st.text
      ctx.font = `700 ${fs}px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(tile.value), px + CELL / 2, py + CELL / 2 + 2)
    }
  }

  function draw(now: number) {
    ctx.clearRect(0, 0, W, H)
    // 空格底色
    ctx.fillStyle = C.border
    ctx.globalAlpha = 0.35
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const { px, py } = cellXY(x, y)
        rr(px, py, CELL, CELL, 10)
      }
    ctx.globalAlpha = 1

    const slideT = Math.min(1, (now - moveTime) / 130)
    for (const t of tiles) drawTile(t, now, slideT)
  }

  // ready 状态就要有完整棋盘：先 reset 再进渲染循环，
  // 避免绘制依赖“开始后才存在”的状态（贪吃蛇踩过的坑）
  reset()
  syncOverlay()

  let raf = 0
  function loop(now: number) {
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
    const d = map[e.code]
    if (!d) return
    e.preventDefault()
    if (state === 'ready' || state === 'over') start()
    if (state === 'play') move(d)
  }

  // 点击/轻点遮罩开始或重开（遮罩可见时覆盖画布，拦截指针事件），
  // 按钮点击冒泡时跳过避免二次触发
  function onOverlayClick(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-restart],[data-continue]')) return
    if (state === 'ready' || state === 'over') start()
  }

  // 移动端：滑动手势移动，轻点开始
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
    move(d)
    touchX = t.clientX
    touchY = t.clientY
  }

  document.addEventListener('keydown', onKey)
  overlay.addEventListener('click', onOverlayClick)
  canvas.addEventListener('touchstart', onTouchStart, { passive: false })
  canvas.addEventListener('touchmove', onTouchMove, { passive: false })

  cleanup = () => {
    cancelAnimationFrame(raf)
    document.removeEventListener('keydown', onKey)
    overlay.removeEventListener('click', onOverlayClick)
    canvas.removeEventListener('touchstart', onTouchStart)
    canvas.removeEventListener('touchmove', onTouchMove)
    gIO?.disconnect()
  }
})

onUnmounted(() => cleanup())

// 与 `start` 相同的委托模式：模板按钮触达 setup 作用域的包装函数，
// 实际逻辑在 onMounted 中赋给 `_keep`。
let _keep = () => {}
function keepGoing() {
  _keep()
}
</script>

<template>
  <div>
    <div class="game__stage">
      <canvas ref="canvasEl" width="952" height="952" role="img" aria-label="2048 game"></canvas>
      <div ref="overlayEl" class="game__overlay">
        <template v-if="isReady || isOver">
          <div class="game__state-title">{{ isReady ? 'Merge to 2048' : 'Game Over' }}</div>
          <div class="game__state-sub">
            <template v-if="isReady">Arrows / WASD / swipe to slide</template>
            <template v-else>Score <b>{{ scoreText }}</b> · Best <b>{{ bestText }}</b></template>
          </div>
          <button v-if="isOver" class="btn btn--primary" data-restart @click="start">
            Play again
          </button>
        </template>
        <template v-else-if="isWon">
          <div class="game__state-title">You win!</div>
          <div class="game__state-sub">Score <b>{{ scoreText }}</b> · Best <b>{{ bestText }}</b></div>
          <button class="btn btn--primary" data-continue @click="keepGoing">
            Keep going
          </button>
          <button class="btn" data-restart @click="start">Restart</button>
        </template>
      </div>
    </div>
    <div class="game__hint">
      <span>Score <b>{{ scoreText }}</b> · Best <b>{{ bestText }}</b></span>
      <span><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> / <kbd>WASD</kbd> slide</span>
      <span><kbd style="cursor: pointer">swipe</kbd> on mobile</span>
      <span>Same numbers merge — reach 2048.</span>
    </div>
  </div>
</template>
