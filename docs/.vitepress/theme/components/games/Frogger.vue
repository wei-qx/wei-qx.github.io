<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const canvasEl = ref<HTMLCanvasElement | null>(null)
const overlayEl = ref<HTMLDivElement | null>(null)
const scoreText = ref('0')
const bestText = ref('0')
const isOver = ref(false)
const isReady = ref(true)

let cleanup = () => {}

// `start` 需要能从模板（"Play again" 按钮）触达，实际逻辑在 onMounted 中赋给 `_start`
let _start = () => {}
function start() {
  _start()
}

onMounted(() => {
  const canvas = canvasEl.value
  const overlay = overlayEl.value
  if (!canvas || !canvas.getContext || !overlay) return
  const ctx = canvas.getContext('2d')!

  const COLS = 13
  const ROWS = 12
  const CELL = 46
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

  type Dir = 'up' | 'down' | 'left' | 'right'
  const DIRS: Record<Dir, { x: number; y: number }> = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  }

  type Car = { x: number; y: number; w: number; h: number; v: number; truck: boolean }
  type Lane = { row: number; dir: 1 | -1; speed: number }

  // 车道布局：0/11 草地，1-3 路段，4 安全带，5-7 路段，8 安全带，9-10 路段
  const ROAD_ROWS = [1, 2, 3, 5, 6, 7, 9, 10]
  const MEDIAN_ROWS = [4, 8]

  let state: 'ready' | 'play' | 'over' = 'ready'
  let score = 0
  let lives = 3
  let level = 1
  let hi = 0
  try {
    hi = parseInt(localStorage.getItem('devlog-frog-hi') || '0', 10) || 0
  } catch {
    hi = 0
  }
  bestText.value = String(hi)

  // 青蛙：gx/gy 是格子坐标；跳跃动画期间用 fx/fy 的像素插值
  const frog = { gx: 6, gy: ROWS - 1, fx: 0, fy: 0 }
  let hopFrom: { x: number; y: number } | null = null
  let hopT = 1 // 1 = 跳跃结束
  let grace = 0 // 过关/复活后的短暂无敌帧
  let frame = 0
  let cars: Car[] = []
  let squash = 0 // 被撞后的压扁动画帧数
  let furthest = 0 // 本局到达的最远行（用于计分）

  function laneSpeed(base: number) {
    return base * (1 + (level - 1) * 0.18)
  }

  function buildCars() {
    cars = []
    for (const row of ROAD_ROWS) {
      const dir: 1 | -1 = row % 2 === 0 ? 1 : -1
      const base = 0.7 + Math.random() * 1.1
      // 每车道 2-3 辆，保证有可穿越的间隙
      const n = 2 + Math.floor(Math.random() * 2)
      for (let i = 0; i < n; i++) {
        const truck = Math.random() < 0.3
        const w = truck ? CELL * 2.2 : CELL * (1.1 + Math.random() * 0.5)
        cars.push({
          x: (W / n) * i + Math.random() * (W / n - w),
          y: row * CELL,
          w,
          h: CELL * 0.68,
          v: laneSpeed(base) * dir,
          truck,
        })
      }
    }
  }

  function resetFrog() {
    frog.gx = Math.floor(COLS / 2)
    frog.gy = ROWS - 1
    frog.fx = frog.gx * CELL
    frog.fy = frog.gy * CELL
    hopFrom = null
    hopT = 1
    squash = 0
  }

  function syncOverlay() {
    overlay.style.display = state === 'play' ? 'none' : ''
    isReady.value = state === 'ready'
    isOver.value = state === 'over'
  }

  function reset() {
    score = 0
    lives = 3
    level = 1
    grace = 0
    furthest = 0
    scoreText.value = '0'
    buildCars()
    resetFrog()
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
        localStorage.setItem('devlog-frog-hi', String(hi))
      } catch {
        /* ignore */
      }
    }
    bestText.value = String(hi)
    syncOverlay()
  }

  function die() {
    squash = 36
    lives--
    if (lives <= 0) {
      gameOver()
      return
    }
    // 延迟复位，让压扁动画可见
    window.setTimeout(() => {
      if (state === 'play') {
        resetFrog()
        grace = 50
      }
    }, 450)
  }

  function hop(d: Dir) {
    if (state !== 'play' || hopT < 1 || squash > 0) return
    const v = DIRS[d]
    const nx = frog.gx + v.x
    const ny = frog.gy + v.y
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return
    frog.gx = nx
    frog.gy = ny
    hopFrom = { x: frog.fx, y: frog.fy }
    hopT = 0
    // 越走越深得分（每前进一行 +10）
    if (ROWS - 1 - ny > furthest) {
      score += 10 * ((ROWS - 1 - ny) - furthest)
      furthest = ROWS - 1 - ny
      scoreText.value = String(score)
    }
    // 到达对岸：升级 + 奖励 + 回到起点
    if (ny === 0) {
      score += 100
      level++
      furthest = 0
      buildCars() // 用新速度重新生成车流
      resetFrog()
      grace = 70
      scoreText.value = String(score)
    }
  }

  function update() {
    frame++
    // 跳跃动画推进
    if (hopT < 1) {
      hopT = Math.min(1, hopT + 0.14)
      const e = 1 - Math.pow(1 - hopT, 2)
      frog.fx = (hopFrom!.x + (frog.gx * CELL - hopFrom!.x) * e)
      frog.fy = (hopFrom!.y + (frog.gy * CELL - hopFrom!.y) * e)
    } else {
      frog.fx = frog.gx * CELL
      frog.fy = frog.gy * CELL
    }
    if (grace > 0) grace--
    if (squash > 0) squash--
    if (state !== 'play') return

    // 车流移动，越界环绕
    for (const c of cars) {
      c.x += c.v
      if (c.v > 0 && c.x > W + 10) c.x = -c.w - 10 - Math.random() * 60
      else if (c.v < 0 && c.x < -c.w - 10) c.x = W + 10 + Math.random() * 60
    }

    // 碰撞：青蛙 AABB（压扁动画与无敌帧内忽略）
    if (squash <= 0 && grace <= 0) {
      const fl = frog.fx + CELL * 0.28
      const fr = frog.fx + CELL * 0.72
      const ft = frog.fy + CELL * 0.26
      const fb = frog.fy + CELL * 0.78
      for (const c of cars) {
        if (fr > c.x + 6 && fl < c.x + c.w - 6 && fb > c.y + 4 && ft < c.y + CELL - 4) {
          die()
          break
        }
      }
    }
  }

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

  function drawBoard() {
    for (let y = 0; y < ROWS; y++) {
      const road = ROAD_ROWS.includes(y)
      ctx.fillStyle = C.border
      ctx.globalAlpha = road ? 0.18 : 0.4
      ctx.fillRect(0, y * CELL, W, CELL)
    }
    ctx.globalAlpha = 1
    // 车道分隔虚线
    ctx.strokeStyle = C.border
    ctx.globalAlpha = 0.6
    ctx.lineWidth = 2
    ctx.setLineDash([14, 12])
    for (let i = 0; i < ROAD_ROWS.length - 1; i++) {
      const a = ROAD_ROWS[i]
      const b = ROAD_ROWS[i + 1]
      if (b === a + 1) {
        const y = b * CELL
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()
      }
    }
    ctx.setLineDash([])
    ctx.globalAlpha = 1
  }

  function drawCar(c: Car) {
    const cy = c.y + (CELL - c.h) / 2
    ctx.fillStyle = c.truck ? C.muted : C.accent
    ctx.globalAlpha = c.truck ? 0.9 : 0.95
    rr(c.x, cy, c.w, c.h, c.truck ? 4 : 8)
    ctx.globalAlpha = 1
    // 车窗
    ctx.fillStyle = C.warm
    if (c.v > 0) rr(c.x + c.w - c.h * 0.55, cy + 5, c.h * 0.4, c.h - 10, 3)
    else rr(c.x + c.h * 0.15, cy + 5, c.h * 0.4, c.h - 10, 3)
  }

  function drawFrog() {
    const s = squash > 0 ? 1 + Math.min(0.5, (36 - squash) / 36) : 1
    const w = CELL * 0.56 / s
    const h = CELL * 0.5 * s
    const cx = frog.fx + CELL / 2
    const cy = frog.fy + CELL / 2
    // 无敌帧闪烁
    if (grace > 0 && Math.floor(frame / 5) % 2 === 0) return
    ctx.fillStyle = squash > 0 ? C.muted : C.fg
    rr(cx - w / 2, cy - h / 2, w, h, 8)
    // 眼睛
    ctx.fillStyle = C.warm
    const ey = cy - h / 2 + 5
    ctx.fillRect(cx - w / 4 - 2, ey, 4, 4)
    ctx.fillRect(cx + w / 4 - 2, ey, 4, 4)
  }

  function drawHUD() {
    ctx.fillStyle = C.muted
    ctx.font = '12px monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`SCORE ${score}  LV ${level}  ❤ ${lives}`, 10, 8)
  }

  function draw() {
    ctx.clearRect(0, 0, W, H)
    drawBoard()
    for (const c of cars) drawCar(c)
    drawFrog()
    drawHUD()
  }

  // ready 状态就摆好车流与青蛙（贪吃蛇的教训：绘制不依赖"开始后"的状态）
  buildCars()
  resetFrog()
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
    if (state !== 'play') {
      start()
      return
    }
    hop(d)
  }

  // 触屏：滑动定向跳，轻点前进
  let touchX = 0
  let touchY = 0
  let touchMoved = false // 滑动过的触摸抬手时不再当作轻点
  function onTouchStart(e: TouchEvent) {
    const t = e.touches[0]
    touchX = t.clientX
    touchY = t.clientY
    touchMoved = false
  }
  function onTouchMove(e: TouchEvent) {
    e.preventDefault()
    if (state !== 'play') return
    const t = e.touches[0]
    const dx = t.clientX - touchX
    const dy = t.clientY - touchY
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return
    const d: Dir =
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
    hop(d)
    touchMoved = true
    touchX = t.clientX
    touchY = t.clientY
  }
  function onTouchEnd(e: TouchEvent) {
    if (state !== 'play') return
    e.preventDefault()
    // 整个触摸过程无明显位移才视为轻点 → 前进一格
    const t = e.changedTouches[0]
    if (!touchMoved && Math.abs(t.clientX - touchX) < 20 && Math.abs(t.clientY - touchY) < 20)
      hop('up')
  }

  // 点击/轻点遮罩开始或重开（遮罩可见时覆盖画布），按钮冒泡跳过
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
      <canvas ref="canvasEl" width="1196" height="1104" role="img" aria-label="Frogger game"></canvas>
      <div ref="overlayEl" class="game__overlay">
        <template v-if="!isOver">
          <div class="game__state-title">Cross the road</div>
          <div class="game__state-sub">Arrows / WASD / swipe to hop</div>
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
      <span><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> / <kbd>WASD</kbd> hop</span>
      <span><kbd style="cursor: pointer">tap</kbd> = hop forward</span>
      <span>Reach the top to level up — traffic gets faster.</span>
    </div>
  </div>
</template>
