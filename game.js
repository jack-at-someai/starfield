// ============================================================
// Starfield Lockpicking — Game Engine
// ============================================================

const TAU = Math.PI * 2;
const DEG = TAU / 360;

// ---- Puzzle Generation ----

function generateRing(bits) {
    // Generate a ring with some filled and some empty positions
    // At least 2 holes, at most bits-2 holes
    const minHoles = 2;
    const maxHoles = Math.max(minHoles, Math.floor(bits * 0.6));
    const holeCount = minHoles + Math.floor(Math.random() * (maxHoles - minHoles + 1));
    const ring = new Array(bits).fill(1);
    const indices = Array.from({ length: bits }, (_, i) => i);
    // shuffle and pick holeCount indices to be holes
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    for (let i = 0; i < holeCount; i++) ring[indices[i]] = 0;
    return ring;
}

function generateKeysForRing(ring, keyCount) {
    // Generate keys that together fill all holes in the ring
    // Split the holes among keyCount keys, each key covers some holes
    const bits = ring.length;
    const holes = [];
    for (let i = 0; i < bits; i++) if (ring[i] === 0) holes.push(i);

    // Shuffle holes
    for (let i = holes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [holes[i], holes[j]] = [holes[j], holes[i]];
    }

    // Distribute holes across keys (each key gets at least 1)
    const keys = [];
    const perKey = Math.max(1, Math.floor(holes.length / keyCount));
    let idx = 0;
    for (let k = 0; k < keyCount; k++) {
        const key = new Array(bits).fill(0);
        const end = k === keyCount - 1 ? holes.length : Math.min(idx + perKey, holes.length);
        for (let i = idx; i < end; i++) key[holes[i]] = 1;
        if (key.some(v => v === 1)) keys.push(key);
        idx = end;
        if (idx >= holes.length) break;
    }

    // Apply a random rotation to each key (the player has to find the right rotation)
    return keys.map(key => {
        const rot = Math.floor(Math.random() * bits);
        return rotateBits(key, -rot); // rotate backwards so that +rot aligns it
    });
}

function generatePuzzle(bits, ringCount, keysPerRing) {
    const rings = [];
    const allKeys = [];
    for (let r = 0; r < ringCount; r++) {
        const ring = generateRing(bits);
        rings.push(ring);
        const keys = generateKeysForRing(ring, keysPerRing);
        allKeys.push(...keys);
    }
    // Shuffle the key order so they aren't grouped by ring
    for (let i = allKeys.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allKeys[i], allKeys[j]] = [allKeys[j], allKeys[i]];
    }
    return { rings, keys: allKeys };
}

// ---- Binary Helpers ----

function rotateBits(arr, n) {
    const len = arr.length;
    const r = ((n % len) + len) % len;
    return arr.map((_, i) => arr[(i + r) % len]);
}

function keyFitsRing(key, ring) {
    // Key fits if every key-1 lands on a ring-0
    if (key.every(v => v === 0)) return false;
    return key.every((v, i) => !(v === 1 && ring[i] === 1));
}

function applyKey(key, ring) {
    return ring.map((v, i) => v | key[i]);
}

function ringComplete(ring) {
    return ring.every(v => v === 1);
}

// ---- Rendering ----

function drawArcSegment(ctx, cx, cy, radius, startAngle, endAngle, color, lineWidth) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.stroke();
}

function drawRing(ctx, cx, cy, radius, ring, lineWidth, opts) {
    const bits = ring.length;
    const sweep = TAU / bits;
    const gap = 1.5 * DEG;
    const { filledColor, emptyColor, highlightIndices, highlightColor, invalidIndices, invalidColor } = opts;

    for (let i = 0; i < bits; i++) {
        const start = -Math.PI / 2 + sweep * i + gap;
        const end = start + sweep - gap * 2;
        let color;
        if (highlightIndices && highlightIndices.has(i)) {
            color = highlightColor || 'rgba(92, 228, 200, 0.6)';
        } else if (invalidIndices && invalidIndices.has(i)) {
            color = invalidColor || 'rgba(255, 107, 107, 0.5)';
        } else if (ring[i] === 1) {
            color = filledColor || 'rgba(126, 184, 255, 0.85)';
        } else {
            color = emptyColor || 'rgba(126, 184, 255, 0.08)';
        }
        drawArcSegment(ctx, cx, cy, radius, start, end, color, lineWidth);
    }
}

function drawKeyPreview(ctx, cx, cy, radius, key, lineWidth) {
    const bits = key.length;
    const sweep = TAU / bits;
    const gap = 1.5 * DEG;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'butt';

    // guide arcs
    for (let i = 0; i < bits; i++) {
        const start = -Math.PI / 2 + sweep * i + gap;
        const end = start + sweep - gap * 2;
        ctx.strokeStyle = 'rgba(126, 184, 255, 0.12)';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, start, end);
        ctx.stroke();
    }

    // pin indicators
    const dotAngle = Math.min(6 * DEG, sweep * 0.4);
    ctx.lineWidth = lineWidth * 1.8;
    ctx.strokeStyle = '#5ce4c8';
    ctx.lineCap = 'round';
    for (let i = 0; i < bits; i++) {
        if (key[i] === 1) {
            const mid = -Math.PI / 2 + sweep * i + sweep / 2;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, mid - dotAngle / 2, mid + dotAngle / 2);
            ctx.stroke();
        }
    }
}

function drawKeyThumbnail(canvas, key) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 48;
    const h = canvas.clientHeight || 48;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const r = Math.min(w, h) * 0.35;
    drawKeyPreview(ctx, cx, cy, r, key, 2);
}

// ---- Game State ----

const DIFFICULTIES = [
    { label: 'Novice', bits: 8, rings: 2, keysPerRing: 2 },
    { label: 'Advanced', bits: 12, rings: 2, keysPerRing: 3 },
    { label: 'Expert', bits: 16, rings: 3, keysPerRing: 2 },
    { label: 'Master', bits: 24, rings: 4, keysPerRing: 2 },
];

class Game {
    constructor() {
        this.screen = 'splash';
        this.difficulty = null;
        this.bits = 8;
        this.ringCount = 2;
        this.rings = [];
        this.keys = [];
        this.keyUsed = [];
        this.selectedKey = 0;
        this.rotation = 0;
        this.smoothRotation = 0;
        this.score = 0;
        this.moves = 0;
        this.seconds = 0;
        this.timerStart = null;
        this.history = []; // for undo: { ringIdx, ringSnapshot, keyIdx }
        this.flashMsg = '';
        this.flashTimer = 0;
    }

    startGame(diff) {
        this.difficulty = diff;
        this.bits = diff.bits;
        this.ringCount = diff.rings;
        const puzzle = generatePuzzle(diff.bits, diff.rings, diff.keysPerRing);
        this.rings = puzzle.rings;
        this.keys = puzzle.keys;
        this.keyUsed = new Array(this.keys.length).fill(false);
        this.selectedKey = 0;
        this.rotation = 0;
        this.smoothRotation = 0;
        this.score = 0;
        this.moves = 0;
        this.seconds = 0;
        this.timerStart = performance.now();
        this.history = [];
        this.flashMsg = '';
        this.flashTimer = 0;
        this.screen = 'game';
    }

    get activeRingIdx() {
        // outermost incomplete ring (last in array = outermost visually)
        for (let i = this.rings.length - 1; i >= 0; i--) {
            if (!ringComplete(this.rings[i])) return i;
        }
        return -1;
    }

    get activeRing() {
        const idx = this.activeRingIdx;
        return idx >= 0 ? this.rings[idx] : null;
    }

    get currentKey() {
        if (this.selectedKey < 0 || this.selectedKey >= this.keys.length) return null;
        if (this.keyUsed[this.selectedKey]) return null;
        return this.keys[this.selectedKey];
    }

    get rotatedKey() {
        const k = this.currentKey;
        return k ? rotateBits(k, this.rotation) : null;
    }

    get canSlot() {
        const rk = this.rotatedKey;
        const ring = this.activeRing;
        if (!rk || !ring) return false;
        return keyFitsRing(rk, ring);
    }

    get isInvalid() {
        // Key overlaps with filled positions
        const rk = this.rotatedKey;
        const ring = this.activeRing;
        if (!rk || !ring) return false;
        return rk.some((v, i) => v === 1 && ring[i] === 1);
    }

    selectKey(idx) {
        if (idx < 0 || idx >= this.keys.length || this.keyUsed[idx]) return;
        this.selectedKey = idx;
        this.rotation = 0;
        this.smoothRotation = 0;
    }

    nextKey() {
        let start = this.selectedKey;
        for (let i = 1; i <= this.keys.length; i++) {
            const idx = (start + i) % this.keys.length;
            if (!this.keyUsed[idx]) { this.selectKey(idx); return; }
        }
    }

    rotateLeft() { this.rotation--; }
    rotateRight() { this.rotation++; }

    slot() {
        if (!this.canSlot) return;
        const ringIdx = this.activeRingIdx;
        const ring = this.rings[ringIdx];
        const rk = this.rotatedKey;

        // save for undo
        this.history.push({
            ringIdx,
            ringSnapshot: [...ring],
            keyIdx: this.selectedKey,
        });

        // apply
        this.rings[ringIdx] = applyKey(rk, ring);
        this.keyUsed[this.selectedKey] = true;
        this.moves++;

        // score
        const pinCount = rk.reduce((a, v) => a + v, 0);
        let scoreAdd = 100 + pinCount * pinCount * 10;
        if (ringComplete(this.rings[ringIdx])) {
            scoreAdd += Math.max(1000 - Math.floor(this.seconds) * 5, 0);
            this.flash('Ring cleared!');
        }
        this.score += scoreAdd;

        // check win
        if (this.rings.every(r => ringComplete(r))) {
            this.screen = 'win';
            return;
        }

        // auto-select next available key
        this.nextKey();
        this.rotation = 0;
        this.smoothRotation = 0;
    }

    undo() {
        if (this.history.length === 0) return;
        const entry = this.history.pop();
        this.rings[entry.ringIdx] = entry.ringSnapshot;
        this.keyUsed[entry.keyIdx] = false;
        this.selectedKey = entry.keyIdx;
        this.rotation = 0;
        this.smoothRotation = 0;
        this.moves++;
        this.flash('Undo');
    }

    flash(msg) {
        this.flashMsg = msg;
        this.flashTimer = 90; // frames
    }

    tick() {
        if (this.screen === 'game' && this.timerStart) {
            this.seconds = (performance.now() - this.timerStart) / 1000;
        }
        // smooth rotation
        const target = this.rotation;
        const diff = target - this.smoothRotation;
        if (Math.abs(diff) > 0.01) {
            this.smoothRotation += diff * 0.3;
        } else {
            this.smoothRotation = target;
        }
        // flash decay
        if (this.flashTimer > 0) this.flashTimer--;
    }
}

// ---- App ----

class App {
    constructor() {
        this.game = new Game();
        this.canvas = null;
        this.ctx = null;
        this.splashCanvas = null;
        this.splashCtx = null;
        this.splashData = this.makeSplashData();
        this.swipeStartX = null;
        this.swipeCumul = 0;
        this.init();
    }

    makeSplashData() {
        const rings = [];
        for (let i = 0; i < 5; i++) {
            const ring = generateRing(24);
            rings.push({ ring, rotation: Math.random() * 24, target: Math.floor(Math.random() * 24) });
        }
        return rings;
    }

    init() {
        this.$splash = document.getElementById('splash-screen');
        this.$diff = document.getElementById('difficulty-screen');
        this.$game = document.getElementById('game-screen');
        this.$win = document.getElementById('win-screen');

        this.splashCanvas = document.getElementById('splash-canvas');
        this.splashCtx = this.splashCanvas.getContext('2d');
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // splash
        document.getElementById('btn-start').onclick = () => {
            this.game.screen = 'difficulty';
            this.show();
        };

        // difficulty
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.onclick = () => {
                const d = DIFFICULTIES.find(d => d.label === btn.dataset.label);
                if (d) {
                    this.game.startGame(d);
                    this.show();
                    this.buildKeyTray();
                }
            };
        });

        // controls
        document.getElementById('btn-left').onclick = () => this.game.rotateLeft();
        document.getElementById('btn-right').onclick = () => this.game.rotateRight();
        document.getElementById('btn-slot').onclick = () => { this.game.slot(); this.buildKeyTray(); };
        document.getElementById('btn-undo').onclick = () => { this.game.undo(); this.buildKeyTray(); };

        // win
        document.getElementById('btn-again').onclick = () => {
            const d = this.game.difficulty;
            this.game.startGame(d);
            this.show();
            this.buildKeyTray();
        };
        document.getElementById('btn-diff').onclick = () => {
            this.game.screen = 'difficulty';
            this.show();
        };

        // touch on game canvas
        this.canvas.addEventListener('touchstart', e => { e.preventDefault(); this.swipeStartX = e.touches[0].clientX; this.swipeCumul = 0; }, { passive: false });
        this.canvas.addEventListener('touchmove', e => { e.preventDefault(); if (this.swipeStartX !== null) this.swipeCumul = e.touches[0].clientX - this.swipeStartX; }, { passive: false });
        this.canvas.addEventListener('touchend', () => this.endSwipe());

        // mouse on game canvas
        this.canvas.addEventListener('mousedown', e => { this.swipeStartX = e.clientX; this.swipeCumul = 0; });
        this.canvas.addEventListener('mousemove', e => { if (this.swipeStartX !== null) this.swipeCumul = e.clientX - this.swipeStartX; });
        this.canvas.addEventListener('mouseup', () => this.endSwipe());

        // keyboard
        document.addEventListener('keydown', e => this.onKey(e));

        // splash cycle
        setInterval(() => {
            this.splashData.forEach(d => { d.target = Math.floor(Math.random() * 24); });
        }, 3000);

        window.addEventListener('resize', () => this.resize());
        this.resize();
        this.show();
        this.loop();
    }

    endSwipe() {
        if (this.swipeStartX === null) return;
        const thresh = 30;
        if (this.swipeCumul > thresh) this.game.rotateRight();
        else if (this.swipeCumul < -thresh) this.game.rotateLeft();
        else { if (this.game.canSlot) { this.game.slot(); this.buildKeyTray(); } }
        this.swipeStartX = null;
        this.swipeCumul = 0;
    }

    onKey(e) {
        if (this.game.screen !== 'game') return;
        if (e.key === 'ArrowLeft' || e.key === 'a') this.game.rotateLeft();
        else if (e.key === 'ArrowRight' || e.key === 'd') this.game.rotateRight();
        else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.game.slot(); this.buildKeyTray(); }
        else if (e.key === 'Tab') { e.preventDefault(); this.game.nextKey(); this.buildKeyTray(); }
        else if (e.key === 'z' || e.key === 'Z') { this.game.undo(); this.buildKeyTray(); }
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        [this.splashCanvas, this.canvas].forEach(c => {
            const w = c.clientWidth, h = c.clientHeight;
            c.width = w * dpr;
            c.height = h * dpr;
            c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
        });
    }

    show() {
        const s = this.game.screen;
        this.$splash.classList.toggle('hidden', s !== 'splash');
        this.$diff.classList.toggle('hidden', s !== 'difficulty');
        this.$game.classList.toggle('hidden', s !== 'game');
        this.$win.classList.toggle('hidden', s !== 'win');
        if (s === 'win') this.populateWin();
        if (s === 'game') setTimeout(() => this.resize(), 10);
    }

    buildKeyTray() {
        const tray = document.getElementById('key-tray');
        tray.innerHTML = '';
        this.game.keys.forEach((key, idx) => {
            const slot = document.createElement('div');
            slot.className = 'key-slot';
            if (idx === this.game.selectedKey) slot.classList.add('selected');
            if (this.game.keyUsed[idx]) slot.classList.add('used');
            const cvs = document.createElement('canvas');
            slot.appendChild(cvs);
            slot.onclick = () => {
                this.game.selectKey(idx);
                this.buildKeyTray();
            };
            tray.appendChild(slot);
            // draw after DOM insertion so clientWidth is set
            requestAnimationFrame(() => drawKeyThumbnail(cvs, key));
        });
    }

    populateWin() {
        const g = this.game;
        document.getElementById('win-score').textContent = g.score;
        const m = Math.floor(g.seconds / 60);
        const s = Math.floor(g.seconds % 60).toString().padStart(2, '0');
        document.getElementById('win-time').textContent = `${m}:${s}`;
        document.getElementById('win-moves').textContent = g.moves;
        document.getElementById('win-diff').textContent = g.difficulty.label;
        document.getElementById('win-bits').textContent = g.bits;
        document.getElementById('win-rings').textContent = g.ringCount;
        document.getElementById('win-keys').textContent = `${g.keyUsed.filter(Boolean).length} / ${g.keys.length}`;
    }

    loop() {
        this.game.tick();
        if (this.game.screen === 'splash') this.renderSplash();
        if (this.game.screen === 'game') this.renderGame();
        requestAnimationFrame(() => this.loop());
    }

    renderSplash() {
        const ctx = this.splashCtx;
        const w = this.splashCanvas.clientWidth, h = this.splashCanvas.clientHeight;
        ctx.clearRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2;
        const baseR = Math.min(w, h) * 0.16;
        const step = Math.min(w, h) * 0.085;

        this.splashData.forEach((d, i) => {
            d.rotation += (d.target - d.rotation) * 0.015;
            const r = baseR + i * step;
            const opacity = 0.15 + i * 0.17;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-d.rotation / 24 * TAU);
            ctx.translate(-cx, -cy);
            drawRing(ctx, cx, cy, r, d.ring, Math.max(4, r * 0.09), {
                filledColor: `rgba(126, 184, 255, ${0.7 * opacity})`,
                emptyColor: `rgba(126, 184, 255, ${0.05 * opacity})`,
            });
            ctx.restore();
        });
    }

    renderGame() {
        const ctx = this.ctx;
        const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
        ctx.clearRect(0, 0, w, h);

        const g = this.game;
        const activeIdx = g.activeRingIdx;
        if (activeIdx < 0) return;

        const cx = w / 2, cy = h / 2;
        const maxR = Math.min(w, h) * 0.40;
        const ringSpacing = maxR * 0.18;
        const totalRings = g.rings.length;

        // determine which key positions overlap with filled ring positions (for invalid highlight)
        const rk = g.rotatedKey;
        const activeRing = g.activeRing;
        let highlightSet = null;
        let invalidSet = null;

        if (rk && activeRing) {
            if (g.canSlot) {
                highlightSet = new Set();
                rk.forEach((v, i) => { if (v === 1) highlightSet.add(i); });
            } else if (g.isInvalid) {
                invalidSet = new Set();
                rk.forEach((v, i) => { if (v === 1 && activeRing[i] === 1) invalidSet.add(i); });
            }
        }

        // draw rings from innermost (index 0) to outermost
        for (let i = 0; i < totalRings; i++) {
            const ring = g.rings[i];
            const r = maxR - (totalRings - 1 - i) * ringSpacing;
            const lw = Math.max(6, r * 0.10);
            const complete = ringComplete(ring);
            const isActive = i === activeIdx;

            if (complete) {
                // completed ring: dim green
                drawRing(ctx, cx, cy, r, ring, lw, {
                    filledColor: 'rgba(92, 228, 200, 0.2)',
                    emptyColor: 'rgba(92, 228, 200, 0.05)',
                });
            } else {
                const opacity = isActive ? 1.0 : 0.25;
                drawRing(ctx, cx, cy, r, ring, lw, {
                    filledColor: `rgba(126, 184, 255, ${0.85 * opacity})`,
                    emptyColor: `rgba(126, 184, 255, ${0.08 * opacity})`,
                    highlightIndices: isActive ? highlightSet : null,
                    highlightColor: 'rgba(92, 228, 200, 0.65)',
                    invalidIndices: isActive ? invalidSet : null,
                    invalidColor: 'rgba(255, 107, 107, 0.55)',
                });
            }
        }

        // draw the selected key as outer ring (rotating)
        if (g.currentKey) {
            const pickR = maxR + ringSpacing * 0.8;
            const lw = Math.max(3, pickR * 0.04);
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-g.smoothRotation / g.bits * TAU);
            ctx.translate(-cx, -cy);
            drawKeyPreview(ctx, cx, cy, pickR, g.currentKey, lw);
            ctx.restore();
        }

        // HUD updates
        const min = Math.floor(g.seconds / 60);
        const sec = Math.floor(g.seconds % 60).toString().padStart(2, '0');
        document.getElementById('hud-score').textContent = g.score;
        document.getElementById('hud-time').textContent = `${min}:${sec}`;
        document.getElementById('hud-diff').textContent = g.difficulty.label;

        const remaining = g.rings.filter(r => !ringComplete(r)).length;
        document.getElementById('hud-status').textContent = `${remaining} ring${remaining !== 1 ? 's' : ''} remaining`;

        // button states
        document.getElementById('btn-slot').classList.toggle('disabled', !g.canSlot);
        document.getElementById('btn-undo').classList.toggle('disabled', g.history.length === 0);

        // flash message
        const flashEl = document.getElementById('game-flash');
        if (g.flashTimer > 0) {
            flashEl.textContent = g.flashMsg;
            flashEl.style.opacity = Math.min(1, g.flashTimer / 30);
        } else {
            flashEl.textContent = '';
        }
    }
}

window.addEventListener('DOMContentLoaded', () => new App());
