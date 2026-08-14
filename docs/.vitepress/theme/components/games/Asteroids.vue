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

  const W = 900
  const H = 560
  const DPR = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = W * DPR
  canvas.height = H * DPR
  ctx.scale(DPR, DPR)

  // 线框矢量风：所有元素只描边不填充，与站点极简风格一致
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

  type Ast = {
    x: number
    y: number
    vx: number
    vy: number
    r: number // 碰撞半径
    size: 3 | 2 | 1
    rot: number
    vrot: number
    // 预生成的不规则多边形顶点（半径比例）
    verts: number[]
  }
  type Bullet = { x: number; y: number; vx: number; vy: number; life: number }

  const AST_R: Record<number, number> = { 3: 44, 2: 25, 1: 13 }
  const AST_SCORE: Record<number, number> = { 3: 20, 2: 50, 1: 100 }

  let state: 'ready' | 'play' | 'over' = 'ready'
  let score = 0
  let lives = 3
  let wave = 1
  let frame = 0
  let invuln = 0 // 无敌帧数（重生后闪烁）
  let cool = 0 // 开火冷却
  let hi = 0
  try {
    hi = parseInt(localStorage.getItem('devlog-astro-hi') || '0', 10) || 0
  } catch {
    hi = 0
  }
  bestText.value = String(hi)

  const ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2 }
  let asteroids: Ast[] = []
  let bullets: Bullet[] = []
  const keys: Record<string, boolean> = {}
  let touch: { x: number; y: number } | null = null // 触屏目标点：船朝它转向并推进
  let touchFire = false

  function makeAst(size: 3 | 2 | 1, x?: number, y?: number): Ast {
    const r = AST_R[size]
    // 出生点远离中心（飞船重生区），避免开局即撞
    const px = x ?? Math.random() * W
    const py = y ?? (Math.random() < 0.5 ? Math.random() * H * 0.3 : H * 0.7 + Math.random() * H * 0.3)
    const ang = Math.random() * Math.PI * 2
    const spd = size === 3 ? 0.5 + Math.random() * 0.8 : size === 2 ? 0.9 + Math.random() * 1.1 : 1.4 + Math.random() * 1.4
    const n = 9 + Math.floor(Math.random() * 3)
    const verts = Array.from({ length: n }, () => 0.72 + Math.random() * 0.36)
    return {
      x: px,
      y: py,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      r,
      size,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.03,
      verts,
    }
  }

  function nextWave() {
    asteroids = []
    const count = Math.min(3 + wave, 9)
    for (let i = 0; i < count; i++) asteroids.push(makeAst(3))
  }

  function respawnShip() {
    ship.x = W / 2
    ship.y = H / 2
    ship.vx = 0
    ship.vy = 0
    ship.a = -Math.PI / 2
    invuln = 160
  }

  function syncOverlay() {
    overlay.style.display = state === 'play' ? 'none' : ''
    isReady.value = state === 'ready'
    isOver.value = state === 'over'
  }

  function reset() {
    score = 0
    lives = 3
    wave = 1
    bullets = []
    cool = 0
    scoreText.value = '0'
    nextWave()
    respawnShip()
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
        localStorage.setItem('devlog-astro-hi', String(hi))
      } catch {
        /* ignore */
      }
    }
    bestText.value = String(hi)
    syncOverlay()
  }

  function fire() {
    if (cool > 0) return
    cool = 11
    bullets.push({
      x: ship.x + Math.cos(ship.a) * 14,
      y: ship.y + Math.sin(ship.a) * 14,
      vx: ship.vx + Math.cos(ship.a) * 7.5,
      vy: ship.vy + Math.sin(ship.a) * 7.5,
      life: 62,
    })
  }

  function wrap(o: { x: number; y: number }, pad: number) {
    if (o.x < -pad) o.x = W + pad
    else if (o.x > W + pad) o.x = -pad
    if (o.y < -pad) o.y = H + pad
    else if (o.y > H + pad) o.y = -pad
  }

  function splitAst(a: Ast) {
    score += AST_SCORE[a.size]
    scoreText.value = String(score)
    if (a.size > 1) {
      for (let i = 0; i < 2; i++) {
        const child = makeAst((a.size - 1) as 2 | 1, a.x, a.y)
        child.vx += a.vx * 0.5
        child.vy += a.vy * 0.5
        asteroids.push(child)
      }
    }
  }

  function update() {
    frame++
    if (state !== 'play') return
    if (invuln > 0) invuln--
    if (cool > 0) cool--

    // —— 输入 ——
    const ROT = 0.095
    const THRUST = 0.14
    if (touch) {
      // 触屏：船朝触点转向，触着即推进并自动开火
      const want = Math.atan2(touch.y - ship.y, touch.x - ship.x)
      let da = want - ship.a
      while (da > Math.PI) da -= Math.PI * 2
      while (da < -Math.PI) da += Math.PI * 2
      ship.a += Math.max(-ROT, Math.min(ROT, da))
      ship.vx += Math.cos(ship.a) * THRUST
      ship.vy += Math.sin(ship.a) * THRUST
      if (touchFire) fire()
    } else {
      if (keys.ArrowLeft || keys.KeyA) ship.a -= ROT
      if (keys.ArrowRight || keys.KeyD) ship.a += ROT
      if (keys.ArrowUp || keys.KeyW) {
        ship.vx += Math.cos(ship.a) * THRUST
        ship.vy += Math.sin(ship.a) * THRUST
      }
      if (keys.Space) fire()
    }

    // 阻尼 + 限速
    ship.vx *= 0.992
    ship.vy *= 0.992
    const spd = Math.hypot(ship.vx, ship.vy)
    if (spd > 6.5) {
      ship.vx = (ship.vx / spd) * 6.5
      ship.vy = (ship.vy / spd) * 6.5
    }
    ship.x += ship.vx
    ship.y += ship.vy
    wrap(ship, 16)

    // —— 子弹 ——
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i]
      b.x += b.vx
      b.y += b.vy
      b.life--
      wrap(b, 4)
      let hit = false
      for (let k = asteroids.length - 1; k >= 0; k--) {
        const a = asteroids[k]
        if (Math.hypot(b.x - a.x, b.y - a.y) < a.r * 0.9) {
          splitAst(a)
          asteroids.splice(k, 1)
          bullets.splice(i, 1)
          hit = true
          break
        }
      }
      if (!hit && b.life <= 0) bullets.splice(i, 1)
    }

    // —— 小行星 ——
    for (const a of asteroids) {
      a.x += a.vx
      a.y += a.vy
      a.rot += a.vrot
      wrap(a, a.r)
      // 飞船碰撞（无敌帧内忽略）
      if (invuln <= 0 && Math.hypot(ship.x - a.x, ship.y - a.y) < a.r * 0.85 + 10) {
        lives--
        bullets = []
        if (lives <= 0) {
          gameOver()
          return
        }
        respawnShip()
        break
      }
    }

    // 清空一波 → 下一波
    if (asteroids.length === 0) {
      wave++
      nextWave()
    }
  }

  // —— 绘制 ——

  function strokePoly(pts: [number, number][]) {
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
    ctx.closePath()
    ctx.stroke()
  }

  function drawShip(thrusting: boolean) {
    // 重生无敌期闪烁
    if (invuln > 0 && Math.floor(frame / 4) % 2 === 0) return
    ctx.save()
    ctx.translate(ship.x, ship.y)
    ctx.rotate(ship.a)
    ctx.strokeStyle = C.fg
    ctx.lineWidth = 2
    strokePoly([
      [14, 0],
      [-11, 9],
      [-6, 0],
      [-11, -9],
    ])
    if (thrusting) {
      ctx.strokeStyle = C.accent
      strokePoly([
        [-8, 4],
        [-16 - Math.random() * 6, 0],
        [-8, -4],
      ])
    }
    ctx.restore()
  }

  function drawAst(a: Ast) {
    ctx.save()
    ctx.translate(a.x, a.y)
    ctx.rotate(a.rot)
    ctx.strokeStyle = a.size === 3 ? C.fg : a.size === 2 ? C.fg : C.accent
    ctx.globalAlpha = a.size === 3 ? 0.85 : 1
    ctx.lineWidth = 2
    const pts = a.verts.map(
      (v, i) => [Math.cos((i / a.verts.length) * Math.PI * 2) * a.r * v, Math.sin((i / a.verts.length) * Math.PI * 2) * a.r * v] as [number, number],
    )
    strokePoly(pts)
    ctx.restore()
    ctx.globalAlpha = 1
  }

  function drawHUD() {
    // 左上：分数与波次；右上：剩余生命（小飞船图标）
    ctx.fillStyle = C.muted
    ctx.font = `12px monospace`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`SCORE ${score}   WAVE ${wave}`, 12, 10)
    for (let i = 0; i < lives; i++) {
      ctx.save()
      ctx.translate(W - 20 - i * 22, 16)
      ctx.scale(0.6, 0.6)
      ctx.strokeStyle = C.muted
      ctx.lineWidth = 2
      strokePoly([
        [10, 0],
        [-8, 7],
        [-4, 0],
        [-8, -7],
      ])
      ctx.restore()
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H)
    // 星空背景点缀（固定伪随机，避免每帧闪烁）
    ctx.fillStyle = C.border
    for (let i = 0; i < 40; i++) {
      const sx = (Math.sin(i * 127.1) * 43758.5453) % 1
      const sy = (Math.sin(i * 311.7) * 12543.21) % 1
      ctx.globalAlpha = 0.5
      ctx.fillRect(Math.abs(sx) * W, Math.abs(sy) * H, 1.5, 1.5)
    }
    ctx.globalAlpha = 1
    for (const a of asteroids) drawAst(a)
    ctx.fillStyle = C.warm
    for (const b of bullets) ctx.fillRect(b.x - 1.5, b.y - 1.5, 3, 3)
    if (state !== 'over') drawShip(!!touch || !!(keys.ArrowUp || keys.KeyW))
    drawHUD()
  }

  // ready 状态就画出飞船与行星，避免"空画布"观感（贪吃蛇的教训）
  nextWave()
  respawnShip()
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

  function onKey(e: KeyboardEvent, down: boolean) {
    if (!gameVisible) return
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyD'].includes(e.code)) {
      e.preventDefault()
      keys[e.code] = down
      if (down && state !== 'play') start()
    }
  }
  const onKeyDown = (e: KeyboardEvent) => onKey(e, true)
  const onKeyUp = (e: KeyboardEvent) => onKey(e, false)

  function canvasPos(t: Touch) {
    const r = canvas.getBoundingClientRect()
    return { x: ((t.clientX - r.left) / r.width) * W, y: ((t.clientY - r.top) / r.height) * H }
  }
  function onTouchStart(e: TouchEvent) {
    if (state !== 'play') return
    e.preventDefault()
    touch = canvasPos(e.touches[0])
    touchFire = true
  }
  function onTouchMove(e: TouchEvent) {
    if (!touch) return
    e.preventDefault()
    touch = canvasPos(e.touches[0])
  }
  function onTouchEnd() {
    touch = null
    touchFire = false
  }

  // 点击/轻点遮罩开始或重开（遮罩可见时覆盖画布），按钮冒泡跳过
  function onOverlayClick(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-restart]')) return
    if (state !== 'play') start()
  }

  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)
  overlay.addEventListener('click', onOverlayClick)
  canvas.addEventListener('touchstart', onTouchStart, { passive: false })
  canvas.addEventListener('touchmove', onTouchMove, { passive: false })
  canvas.addEventListener('touchend', onTouchEnd)

  cleanup = () => {
    cancelAnimationFrame(raf)
    document.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('keyup', onKeyUp)
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
      <canvas ref="canvasEl" width="1800" height="1120" role="img" aria-label="Asteroids game"></canvas>
      <div ref="overlayEl" class="game__overlay">
        <template v-if="!isOver">
          <div class="game__state-title">Asteroids</div>
          <div class="game__state-sub">←→ rotate · ↑ thrust · Space fire</div>
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
      <span><kbd>←</kbd><kbd>→</kbd> rotate · <kbd>↑</kbd> thrust · <kbd>Space</kbd> fire</span>
      <span><kbd style="cursor: pointer">touch</kbd> steer &amp; auto-fire on mobile</span>
      <span>Big rocks split into smaller, faster ones.</span>
    </div>
  </div>
</template>
