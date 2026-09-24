# Game Animations and Enemy AI with Phaser — Browser

Demonstrates driving a [Phaser 3](https://phaser.io) game with micro-flow: a one-shot `Workflow` sequences a character's entrance animation, and a long-running `while` `LoopStep` drives each enemy's behavior — patrol, chase, or attack — decided every iteration by a `SwitchStep`. Characters are plain colored squares (`Phaser.GameObjects.Rectangle`) whose position, scale, and color are tweened; there are no sprite sheets involved.

## Overview

You will learn:
- Bridging a Phaser tween (or timer) into a `Promise` so a `Step`'s callable can `await` it
- Modeling a scripted animation sequence (fade in, slide into position, idle bounce) as a `Workflow` of `Step`s and a `LoopStep`, instead of chained `tween.onComplete` callbacks
- Driving continuous AI with a `while`-type `LoopStep` that re-evaluates behavior every iteration until a stop condition (`State.get('game.over')`) becomes true
- Using a `SwitchStep`/`Case` decision tree to pick a behavior from dynamic, per-frame data (distance to the player) — and why the narrowest range has to be checked first
- Keeping workflows and Phaser's own `update()` loop decoupled, coordinating through a simple flag and `State`

## Complete Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>micro-flow + Phaser</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0b0f19;
    }
  </style>
</head>
<body>

<div id="game-container"></div>

<script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"></script>

<script type="importmap">
{
  "imports": {
    "@ronaldroe/micro-flow": "https://cdn.jsdelivr.net/npm/@ronaldroe/micro-flow/dist/index.js"
  }
}
</script>

<script type="module">
import { Workflow, Step, LoopStep, SwitchStep, Case, State, loop_types } from '@ronaldroe/micro-flow';

// ─── Phaser <-> micro-flow bridge ──────────────────────────────────────────────
// The only glue code needed: wrap a Phaser tween (or a timed wait) in a Promise
// so a Step's callable can `await` it like any other async operation.

function tween(scene, targets, config) {
  return new Promise((resolve) => {
    scene.tweens.add({ targets, ...config, onComplete: resolve });
  });
}

function wait(scene, ms) {
  return new Promise((resolve) => scene.time.delayedCall(ms, resolve));
}

// ─── Player entrance: a one-shot animation sequence ────────────────────────────
//
// Each phase is a named, independently observable Step rather than a chain of
// tween.onComplete callbacks. "Play this bounce twice" is a LoopStep config
// value (iterations: 2), not a hand-rolled counter.

function buildEntranceWorkflow(scene, square) {
  return new Workflow({
    name: 'player-entrance',
    exit_on_error: true,
    steps: [
      new Step({
        name: 'fade-in',
        callable: async () => {
          square.setAlpha(0);
          await tween(scene, square, { alpha: 1, duration: 400 });
        },
      }),
      new Step({
        name: 'slide-into-position',
        callable: async () => {
          await tween(scene, square, {
            x: square.spawnX,
            y: square.spawnY,
            duration: 500,
            ease: 'Cubic.Out',
          });
        },
      }),
      new LoopStep({
        name: 'idle-bounce',
        loop_type: loop_types.FOR,
        iterations: 2,
        callable: async () => {
          // A squash-and-stretch on scale, standing in for a sprite-sheet idle animation.
          await tween(scene, square, { scaleY: 1.2, duration: 150, yoyo: true, ease: 'Sine.InOut' });
        },
      }),
    ],
  });
}

// ─── Enemy behavior: a continuous AI loop ──────────────────────────────────────
//
// A `while` LoopStep re-evaluates behavior every iteration until State.get('game.over')
// becomes true - the loop rechecks its condition at the top of each pass, so setting
// that flag (e.g. on scene shutdown) is enough to stop it cleanly. Each iteration builds
// a fresh SwitchStep to pick attack/chase/patrol from the current distance to the
// player: cases are evaluated in order, so the narrowest range (attack) has to come
// before the wider one (chase), the same way a switch/case falls through.

const ATTACK_RANGE = 60;
const CHASE_RANGE = 220;

function buildEnemyBehaviorWorkflow(scene, enemy) {
  return new Workflow({
    name: `enemy-ai-${enemy.name}`,
    steps: [
      new LoopStep({
        name: 'behavior-loop',
        loop_type: loop_types.WHILE,
        max_iterations: 100000,
        // A LoopStep's timeout covers the whole loop, and this one runs until the game ends,
        // so turn it off (the default 30s would fail the loop mid-game).
        max_timeout_ms: null,
        conditional: {
          subject: () => State.get('game.over') ?? false,
          operator: '===',
          value: false,
        },
        callable: async function () {
          const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, scene.player.x, scene.player.y);

          const decision = new SwitchStep({
            name: 'choose-behavior',
            subject: distance,
            cases: [
              new Case({
                name: 'attack',
                conditional: { operator: '<=', value: ATTACK_RANGE },
                callable: async () => {
                  await tween(scene, enemy, { scaleX: 1.3, scaleY: 1.3, duration: 120, yoyo: true });
                  enemy.setFillStyle(0xff4444);
                  await wait(scene, 400); // cooldown before deciding again
                  enemy.setFillStyle(0xdd2222);
                  return 'attack';
                },
              }),
              new Case({
                name: 'chase',
                conditional: { operator: '<=', value: CHASE_RANGE },
                callable: async () => {
                  const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, scene.player.x, scene.player.y);
                  await tween(scene, enemy, {
                    x: enemy.x + Math.cos(angle) * 40,
                    y: enemy.y + Math.sin(angle) * 40,
                    scaleX: 0.9,
                    scaleY: 1.1,
                    duration: 250,
                    yoyo: true,
                  });
                  return 'chase';
                },
              }),
            ],
            default_callable: async () => {
              // No case matched (player out of range) - patrol back and forth around home.
              enemy.patrolDirection = enemy.patrolDirection === 'right' ? 'left' : 'right';
              const targetX = enemy.patrolDirection === 'right'
                ? enemy.patrolHomeX + 60
                : enemy.patrolHomeX - 60;
              await tween(scene, enemy, {
                x: targetX,
                angle: enemy.patrolDirection === 'right' ? 8 : -8,
                duration: 900,
                ease: 'Sine.InOut',
              });
              return 'patrol';
            },
          });

          const behavior = await decision.execute();
          this.setState(`enemies.${enemy.name}.lastBehavior`, behavior.result);
        },
      }),
    ],
  });
}

// ─── Scene ──────────────────────────────────────────────────────────────────────

class ArenaScene extends Phaser.Scene {
  constructor() {
    super('arena');
  }

  create() {
    State.reset();
    State.set('game.over', false);

    // Player square - spawns off-screen so the entrance slide is visible.
    this.player = this.add.rectangle(-40, 300, 32, 32, 0x2288ff);
    this.player.spawnX = 400;
    this.player.spawnY = 300;
    this.player.ready = false;

    buildEntranceWorkflow(this, this.player)
      .execute()
      .then(() => { this.player.ready = true; });

    // Enemy squares.
    this.enemies = [
      this.add.rectangle(120, 120, 28, 28, 0xdd2222),
      this.add.rectangle(680, 460, 28, 28, 0xdd2222),
    ];

    this.enemies.forEach((enemy, i) => {
      enemy.name = `enemy-${i}`;
      enemy.patrolHomeX = enemy.x;
      enemy.patrolDirection = 'right';
      buildEnemyBehaviorWorkflow(this, enemy).execute();
    });

    // Arrow keys move the player - plain Phaser, deliberately not routed through a Step.
    this.cursors = this.input.keyboard.createCursorKeys();

    // A small status readout of each enemy's last AI decision.
    this.statusText = this.add.text(12, 12, '', { fontFamily: 'monospace', fontSize: 14, color: '#e5e7eb' });
    this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        const lines = this.enemies.map(
          (enemy) => `${enemy.name}: ${State.get(`enemies.${enemy.name}.lastBehavior`) ?? 'patrol'}`
        );
        this.statusText.setText(lines);
      },
    });

    // Stop every enemy's while-loop when the scene shuts down.
    this.events.once('shutdown', () => State.set('game.over', true));
  }

  update() {
    if (!this.player.ready) return; // don't fight the entrance tween with direct position sets

    const speed = 4;
    if (this.cursors.left.isDown)  this.player.x -= speed;
    if (this.cursors.right.isDown) this.player.x += speed;
    if (this.cursors.up.isDown)    this.player.y -= speed;
    if (this.cursors.down.isDown)  this.player.y += speed;
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#111827',
  parent: 'game-container',
  scene: [ArenaScene],
});
</script>

</body>
</html>
```

## Key Concepts

### Tweens become `await`-able Steps

Phaser's tween and timer APIs are callback-based (`onComplete`); the `tween()`/`wait()` helpers wrap them in a `Promise` once, and every step callable in this example just `await`s them like any other async call. This is the entire integration surface between the two libraries.

### A `Workflow` for a one-shot sequence, a `while` `LoopStep` for a continuous behavior

The entrance animation has a clear beginning and end, so it's a `Workflow` of `Step`s that runs once and resolves. Enemy AI doesn't — it's a `while`-type `LoopStep` that keeps re-evaluating for as long as `State.get('game.over')` is `false`, rechecking that condition at the top of every iteration (see [LoopStep § Loop Types](../classes/steps/loop_step.md#loop-types)). Because a `LoopStep`'s `max_timeout_ms` covers the entire loop rather than each iteration, the behavior loop sets it to `null`; otherwise the default 30-second timeout would fail it partway through a game.

### Cases are evaluated in order — narrowest range first

`SwitchStep` runs its `cases` in declaration order and stops at the first match. `attack` (`distance <= 60`) is listed before `chase` (`distance <= 220`) deliberately: a distance of 30 satisfies both conditions, and only the first one checked ever gets to execute. This is the same pattern used in [SwitchStep's range-based case example](../classes/steps/switch_step.md).

### Fresh `SwitchStep`/`Case` instances every iteration

`choose-behavior` is constructed inside the loop's callable, not hoisted outside it. Reusing a `Case` across iterations would carry over its `is_matched` flag and whatever `conditional.subject` the previous iteration's distance set on it — building a new one each time keeps every decision independent, the same reasoning as rebuilding a workflow on each run in the [Animation Sequencing](animation-browser.md#rebuilding-on-each-run) example.

### Decoupling workflows from Phaser's `update()` loop

Nothing here runs inside `update()`. The entrance workflow and each enemy's behavior loop are independent async chains driven by their own awaited tweens/waits — `update()` only handles direct keyboard input for the player. The `player.ready` flag is the coordination point: it stops `update()` from fighting the entrance tween by setting `x`/`y` directly while the slide-in is still animating.

## Related Examples

- [Animation Sequencing — Browser](animation-browser.md) — `DelayStep`-driven CSS animation phases, without a game engine.
- [Basic Workflow — Node.js](basic-workflow-node.md) — Core `Workflow`/`Step` patterns.
- [Step Hopping — Node.js](step-hopping-node.md) — Dynamic step manipulation and pause/resume.
