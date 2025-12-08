# Animation Sequencing - Vanilla JavaScript

A vanilla JavaScript example demonstrating animation sequencing using workflows.

## Overview

This example shows how to orchestrate complex animations using micro-flow workflows in plain JavaScript, without any framework.

## HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Animation Workflow Demo</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      background: #f0f0f0;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
    }

    .controls {
      display: flex;
      gap: 10px;
      margin-bottom: 30px;
    }

    button {
      padding: 12px 24px;
      border: none;
      border-radius: 4px;
      background: #4CAF50;
      color: white;
      cursor: pointer;
      font-size: 16px;
    }

    button:hover {
      background: #45a049;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .stage {
      position: relative;
      width: 100%;
      height: 400px;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .box {
      position: absolute;
      width: 50px;
      height: 50px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      transition: all 0.5s ease;
    }

    #box1 { background: #f44336; top: 50px; left: 50px; }
    #box2 { background: #2196F3; top: 50px; left: 150px; }
    #box3 { background: #4CAF50; top: 50px; left: 250px; }
    #box4 { background: #FF9800; top: 50px; left: 350px; }

    .status {
      margin-top: 20px;
      padding: 15px;
      background: white;
      border-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }

    .status h3 {
      margin-bottom: 10px;
    }

    .timeline {
      margin-top: 20px;
      padding: 15px;
      background: white;
      border-radius: 4px;
      max-height: 200px;
      overflow-y: auto;
    }

    .timeline-entry {
      padding: 5px 0;
      border-bottom: 1px solid #eee;
      font-size: 14px;
    }

    .timeline-entry:last-child {
      border-bottom: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Animation Workflow Demo</h1>
    
    <div class="controls">
      <button id="sequenceBtn">Run Sequence</button>
      <button id="parallelBtn">Run Parallel</button>
      <button id="choreographyBtn">Run Choreography</button>
      <button id="resetBtn">Reset</button>
    </div>

    <div class="stage">
      <div class="box" id="box1">1</div>
      <div class="box" id="box2">2</div>
      <div class="box" id="box3">3</div>
      <div class="box" id="box4">4</div>
    </div>

    <div class="status">
      <h3>Status: <span id="statusText">Ready</span></h3>
      <p>Current Animation: <span id="currentAnim">None</span></p>
      <p>Progress: <span id="progress">0%</span></p>
    </div>

    <div class="timeline">
      <h3>Animation Timeline</h3>
      <div id="timelineEntries"></div>
    </div>
  </div>

  <script type="module" src="animation-demo.js"></script>
</body>
</html>
```

## JavaScript

```javascript
import { Workflow, Step, State } from './micro-flow.js';

// DOM elements
const sequenceBtn = document.getElementById('sequenceBtn');
const parallelBtn = document.getElementById('parallelBtn');
const choreographyBtn = document.getElementById('choreographyBtn');
const resetBtn = document.getElementById('resetBtn');
const statusText = document.getElementById('statusText');
const currentAnim = document.getElementById('currentAnim');
const progress = document.getElementById('progress');
const timelineEntries = document.getElementById('timelineEntries');

// Boxes
const boxes = {
  box1: document.getElementById('box1'),
  box2: document.getElementById('box2'),
  box3: document.getElementById('box3'),
  box4: document.getElementById('box4')
};

// Helper function to add timeline entry
function addTimelineEntry(message) {
  const entry = document.createElement('div');
  entry.className = 'timeline-entry';
  entry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
  timelineEntries.insertBefore(entry, timelineEntries.firstChild);
}

// Animation helper function
function animate(element, props, duration = 500) {
  return new Promise(resolve => {
    Object.entries(props).forEach(([key, value]) => {
      element.style[key] = value;
    });
    setTimeout(resolve, duration);
  });
}

// Reset positions
function resetBoxes() {
  boxes.box1.style.transform = 'translate(0, 0) rotate(0deg) scale(1)';
  boxes.box2.style.transform = 'translate(0, 0) rotate(0deg) scale(1)';
  boxes.box3.style.transform = 'translate(0, 0) rotate(0deg) scale(1)';
  boxes.box4.style.transform = 'translate(0, 0) rotate(0deg) scale(1)';
  statusText.textContent = 'Ready';
  currentAnim.textContent = 'None';
  progress.textContent = '0%';
  timelineEntries.innerHTML = '';
  addTimelineEntry('Reset complete');
}

// Sequential Animation Workflow
const createSequenceWorkflow = () => {
  return new Workflow({
    name: 'sequential-animation',
    steps: [
      new Step({
        name: 'animate-box1',
        callable: async () => {
          currentAnim.textContent = 'Box 1';
          addTimelineEntry('Animating Box 1');
          await animate(boxes.box1, { transform: 'translateY(200px)' });
          progress.textContent = '25%';
        }
      }),
      new Step({
        name: 'animate-box2',
        callable: async () => {
          currentAnim.textContent = 'Box 2';
          addTimelineEntry('Animating Box 2');
          await animate(boxes.box2, { transform: 'translateY(200px) rotate(180deg)' });
          progress.textContent = '50%';
        }
      }),
      new Step({
        name: 'animate-box3',
        callable: async () => {
          currentAnim.textContent = 'Box 3';
          addTimelineEntry('Animating Box 3');
          await animate(boxes.box3, { transform: 'translateY(200px) scale(1.5)' });
          progress.textContent = '75%';
        }
      }),
      new Step({
        name: 'animate-box4',
        callable: async () => {
          currentAnim.textContent = 'Box 4';
          addTimelineEntry('Animating Box 4');
          await animate(boxes.box4, { transform: 'translateY(200px) rotate(360deg)' });
          progress.textContent = '100%';
        }
      })
    ]
  });
};

// Parallel Animation (simulated with timing)
const createParallelWorkflow = () => {
  return new Workflow({
    name: 'parallel-animation',
    steps: [
      new Step({
        name: 'animate-all',
        callable: async () => {
          currentAnim.textContent = 'All boxes';
          addTimelineEntry('Animating all boxes in parallel');
          
          // Start all animations at once
          const animations = [
            animate(boxes.box1, { transform: 'translateX(100px) translateY(200px)' }),
            animate(boxes.box2, { transform: 'translateX(-100px) translateY(200px)' }),
            animate(boxes.box3, { transform: 'translateY(250px) rotate(180deg)' }),
            animate(boxes.box4, { transform: 'translateY(150px) scale(2)' })
          ];
          
          await Promise.all(animations);
          progress.textContent = '100%';
          addTimelineEntry('All animations complete');
        }
      })
    ]
  });
};

// Complex Choreography
const createChoreographyWorkflow = () => {
  return new Workflow({
    name: 'choreography',
    steps: [
      new Step({
        name: 'intro',
        callable: async () => {
          currentAnim.textContent = 'Intro';
          addTimelineEntry('Starting choreography');
          await Promise.all([
            animate(boxes.box1, { transform: 'scale(1.2)' }, 300),
            animate(boxes.box2, { transform: 'scale(1.2)' }, 300)
          ]);
          await Promise.all([
            animate(boxes.box3, { transform: 'scale(1.2)' }, 300),
            animate(boxes.box4, { transform: 'scale(1.2)' }, 300)
          ]);
          progress.textContent = '20%';
        }
      }),
      new Step({
        name: 'wave',
        callable: async () => {
          currentAnim.textContent = 'Wave';
          addTimelineEntry('Wave motion');
          for (let i = 1; i <= 4; i++) {
            await animate(boxes[`box${i}`], { 
              transform: 'translateY(-50px) scale(1.2)' 
            }, 200);
            await animate(boxes[`box${i}`], { 
              transform: 'translateY(0) scale(1)' 
            }, 200);
          }
          progress.textContent = '50%';
        }
      }),
      new Step({
        name: 'spin',
        callable: async () => {
          currentAnim.textContent = 'Spin';
          addTimelineEntry('Spinning');
          await Promise.all([
            animate(boxes.box1, { transform: 'rotate(360deg)' }, 800),
            animate(boxes.box2, { transform: 'rotate(-360deg)' }, 800),
            animate(boxes.box3, { transform: 'rotate(360deg)' }, 800),
            animate(boxes.box4, { transform: 'rotate(-360deg)' }, 800)
          ]);
          progress.textContent = '75%';
        }
      }),
      new Step({
        name: 'finale',
        callable: async () => {
          currentAnim.textContent = 'Finale';
          addTimelineEntry('Finale');
          await Promise.all([
            animate(boxes.box1, { 
              transform: 'translateY(150px) translateX(-50px) scale(0.8)' 
            }),
            animate(boxes.box2, { 
              transform: 'translateY(150px) translateX(50px) scale(0.8)' 
            }),
            animate(boxes.box3, { 
              transform: 'translateY(200px) translateX(-50px) scale(0.8)' 
            }),
            animate(boxes.box4, { 
              transform: 'translateY(200px) translateX(50px) scale(0.8)' 
            })
          ]);
          progress.textContent = '100%';
          addTimelineEntry('Choreography complete');
        }
      })
    ]
  });
};

// Button handlers
sequenceBtn.addEventListener('click', async () => {
  resetBoxes();
  statusText.textContent = 'Running Sequential...';
  disableButtons(true);
  
  const workflow = createSequenceWorkflow();
  await workflow.execute();
  
  statusText.textContent = 'Complete';
  disableButtons(false);
  addTimelineEntry('Sequential animation complete');
});

parallelBtn.addEventListener('click', async () => {
  resetBoxes();
  statusText.textContent = 'Running Parallel...';
  disableButtons(true);
  
  const workflow = createParallelWorkflow();
  await workflow.execute();
  
  statusText.textContent = 'Complete';
  disableButtons(false);
});

choreographyBtn.addEventListener('click', async () => {
  resetBoxes();
  statusText.textContent = 'Running Choreography...';
  disableButtons(true);
  
  const workflow = createChoreographyWorkflow();
  await workflow.execute();
  
  statusText.textContent = 'Complete';
  disableButtons(false);
});

resetBtn.addEventListener('click', resetBoxes);

function disableButtons(disabled) {
  sequenceBtn.disabled = disabled;
  parallelBtn.disabled = disabled;
  choreographyBtn.disabled = disabled;
}

// Initialize
addTimelineEntry('Animation demo initialized');
```

## Key Features

- **Sequential animations** with step-by-step execution
- **Parallel animations** using Promise.all
- **Complex choreography** with multiple animation stages
- **Progress tracking** with visual feedback
- **Timeline logging** for debugging
- **Reusable animation helpers**

## Animation Patterns

### Sequential
Boxes animate one after another in sequence.

### Parallel
All boxes animate simultaneously.

### Choreography
A complex sequence with multiple stages and coordinated movements.

## Related Examples

- [React Form Workflow](form-workflow-react.md)
- [Vue Data Fetching](data-fetching-vue.md)
