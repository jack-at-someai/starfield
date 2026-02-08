# Starfield

Binary radial lockpicking game. Rotate keys to fit binary encodings into concentric lock rings until every bit is filled. Simple mechanic, infinite depth.

## How It Works

Locks are concentric rings. Each ring is a binary array — segments are either filled (`1`) or empty (`0`). You get a set of keys (also binary arrays). Rotate a key until its `1` bits align with the lock's `0` gaps, then slot it in. Fill every position to clear the ring. Clear all rings to pick the lock.

The core mechanic is just getting to all `1`s in a binary string by layering rotated binary patterns on top of each other. Simple to learn, brutal at high bit counts.

## Controls

| Input | Action |
|---|---|
| Swipe left/right | Rotate selected key |
| Tap canvas | Slot key (if valid) |
| Tap key in tray | Select key |
| Arrow keys / A, D | Rotate |
| Space / Enter | Slot key |
| Tab | Cycle keys |
| Z | Undo last placement |

## Difficulty

| Level | Bits | Rings | Keys |
|---|---|---|---|
| Novice | 8 | 2 | 4 |
| Advanced | 12 | 2 | 6 |
| Expert | 16 | 3 | 8 |
| Master | 24 | 4 | 10 |

## Run

Open `index.html`. No build step, no server, no dependencies.

---

## Vision

This is the baseline interactive version. The end goal is a published mobile app with competitive lockpicking — see how fast you picked a lock compared to everyone else who solved the same puzzle.

### Planned Modes

- **Campaign** — curated difficulty progression with level packs unlockable via Apple Pay
- **Daily Puzzle** — same lock for everyone, one attempt, global leaderboard
- **Daily Speed** — race the clock on a set of locks, ranked by completion time
- **Endless** — procedurally generated locks, escalating difficulty, see how far you get

### Planned Features

- Global speed leaderboards per puzzle (the core competitive loop)
- Player profiles with solve history, average times, streaks
- MMR / skill rating based on speed, difficulty, and consistency
- Level packs as IAP (Apple Pay) — themed sets of curated puzzles
- Daily challenge calendar with streak rewards
- Undo system (limited undos as a resource)
- Visual themes / skins

### Platform Targets

Starting as vanilla JS for portability. Planned migrations:
- React Native or Swift for iOS App Store launch
- Kotlin for Android
- The JS version stays as the web/embedded baseline

### Architecture Note

This repo is the core game engine. It will be embedded into the broader project ecosystem as a shared module. Backend, auth, leaderboards, and payment infrastructure come later — the game mechanic needs to be rock solid first.
