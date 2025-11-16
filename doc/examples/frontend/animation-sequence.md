# Animation Sequence (Frontend - Vanilla JS)

This example demonstrates orchestrating complex animation sequences using Micro Flow with delays, conditional logic, and DOM manipulation.

## Use Case

Creating an animated landing page with:
1. Staggered element entrances
2. Sequenced animations
3. Conditional transitions based on user interaction
4. Pause/resume capability
5. Loop animations

## Full Implementation

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Animation Sequence with Micro Flow</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    
    .container {
      text-align: center;
      color: white;
    }
    
    .title {
      font-size: 48px;
      font-weight: bold;
      margin-bottom: 20px;
      opacity: 0;
      transform: translateY(-50px);
    }
    
    .subtitle {
      font-size: 24px;
      margin-bottom: 40px;
      opacity: 0;
      transform: translateY(-30px);
    }
    
    .features {
      display: flex;
      gap: 30px;
      justify-content: center;
      margin-bottom: 40px;
    }
    
    .feature-card {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      padding: 30px;
      border-radius: 10px;
      width: 200px;
      opacity: 0;
      transform: scale(0.8);
    }
    
    .feature-icon {
      font-size: 48px;
      margin-bottom: 15px;
    }
    
    .feature-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 10px;
    }
    
    .feature-desc {
      font-size: 14px;
      opacity: 0.9;
    }
    
    .cta-button {
      background: white;
      color: #667eea;
      padding: 15px 40px;
      border-radius: 30px;
      font-size: 18px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      opacity: 0;
      transform: translateY(20px);
      transition: transform 0.3s, box-shadow 0.3s;
    }
    
    .cta-button:hover {
      transform: translateY(18px) scale(1.05);
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    
    .controls {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 10px;
    }
    
    .control-btn {
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      color: white;
      border: 2px solid white;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
    }
    
    .control-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    
    .particles {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: -1;
    }
    
    .particle {
      position: absolute;
      background: white;
      border-radius: 50%;
      opacity: 0;
    }
    
    @keyframes fadeInUp {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes fadeInScale {
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
  </style>
</head>
<body>
  <div class="particles" id="particles"></div>
  
  <div class="container">
    <h1 class="title" id="title">Welcome to Micro Flow</h1>
    <p class="subtitle" id="subtitle">Orchestrate Your Animations with Ease</p>
    
    <div class="features">
      <div class="feature-card" id="feature1">
        <div class="feature-icon">⚡</div>
        <div class="feature-title">Fast</div>
        <div class="feature-desc">Lightning quick execution</div>
      </div>
      <div class="feature-card" id="feature2">
        <div class="feature-icon">🎯</div>
        <div class="feature-title">Precise</div>
        <div class="feature-desc">Control every detail</div>
      </div>
      <div class="feature-card" id="feature3">
        <div class="feature-icon">🚀</div>
        <div class="feature-title">Powerful</div>
        <div class="feature-desc">Build complex flows</div>
      </div>
    </div>
    
    <button class="cta-button" id="ctaButton">Get Started</button>
  </div>
  
  <div class="controls">
    <button class="control-btn" id="restartBtn">↻ Restart</button>
    <button class="control-btn" id="pauseBtn">⏸ Pause</button>
    <button class="control-btn" id="resumeBtn" disabled>▶ Resume</button>
  </div>
  
  <script type="module">
    import { 
      Workflow, 
      Step, 
      StepTypes, 
      DelayStep,
      DelayTypes,
      LoopStep,
      LoopTypes
    } from 'micro-flow';
    
    // DOM elements
    const title = document.getElementById('title');
    const subtitle = document.getElementById('subtitle');
    const features = [
      document.getElementById('feature1'),
      document.getElementById('feature2'),
      document.getElementById('feature3')
    ];
    const ctaButton = document.getElementById('ctaButton');
    const particlesContainer = document.getElementById('particles');
    
    const restartBtn = document.getElementById('restartBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    
    let mainWorkflow = null;
    
    // Animation utilities
    function animate(element, animation, duration = 600) {
      return new Promise(resolve => {
        element.style.animation = `${animation} ${duration}ms ease-out forwards`;
        setTimeout(resolve, duration);
      });
    }
    
    function createParticle(x, y) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = x + 'px';
      particle.style.top = y + 'px';
      particle.style.width = Math.random() * 4 + 2 + 'px';
      particle.style.height = particle.style.width;
      
      particlesContainer.appendChild(particle);
      
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 100 + 50;
      const lifetime = Math.random() * 1000 + 500;
      
      let posX = x;
      let posY = y;
      let opacity = 1;
      const startTime = Date.now();
      
      function animateParticle() {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / lifetime;
        
        if (progress >= 1) {
          particle.remove();
          return;
        }
        
        posX += Math.cos(angle) * velocity * 0.016;
        posY += Math.sin(angle) * velocity * 0.016 - (progress * 50);
        opacity = 1 - progress;
        
        particle.style.transform = `translate(${posX - x}px, ${posY - y}px)`;
        particle.style.opacity = opacity;
        
        requestAnimationFrame(animateParticle);
      }
      
      animateParticle();
    }
    
    // Create entrance animation workflow
    function createEntranceWorkflow() {
      const workflow = new Workflow({
        name: 'Entrance Animation',
        exit_on_failure: false
      });
      
      // Step 1: Animate title
      workflow.pushStep(new Step({
        name: 'Animate Title',
        type: StepTypes.ACTION,
        callable: async () => {
          console.log('Animating title...');
          await animate(title, 'fadeInUp', 800);
          title.style.animation = 'float 3s ease-in-out infinite';
        }
      }));
      
      // Delay before subtitle
      workflow.pushStep(new DelayStep({
        name: 'Delay Before Subtitle',
        delay_duration: 200,
        delay_type: DelayTypes.RELATIVE
      }));
      
      // Step 2: Animate subtitle
      workflow.pushStep(new Step({
        name: 'Animate Subtitle',
        type: StepTypes.ACTION,
        callable: async () => {
          console.log('Animating subtitle...');
          await animate(subtitle, 'fadeInUp', 800);
        }
      }));
      
      // Delay before features
      workflow.pushStep(new DelayStep({
        name: 'Delay Before Features',
        delay_duration: 300,
        delay_type: DelayTypes.RELATIVE
      }));
      
      // Step 3: Animate features (staggered)
      features.forEach((feature, index) => {
        if (index > 0) {
          workflow.pushStep(new DelayStep({
            name: `Stagger Delay ${index}`,
            delay_duration: 150,
            delay_type: DelayTypes.RELATIVE
          }));
        }
        
        workflow.pushStep(new Step({
          name: `Animate Feature ${index + 1}`,
          type: StepTypes.ACTION,
          callable: async () => {
            console.log(`Animating feature ${index + 1}...`);
            await animate(feature, 'fadeInScale', 600);
            feature.style.animation = 'pulse 2s ease-in-out infinite';
            
            // Burst effect
            const rect = feature.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            for (let i = 0; i < 8; i++) {
              setTimeout(() => createParticle(centerX, centerY), i * 50);
            }
          }
        }));
      });
      
      // Delay before CTA
      workflow.pushStep(new DelayStep({
        name: 'Delay Before CTA',
        delay_duration: 400,
        delay_type: DelayTypes.RELATIVE
      }));
      
      // Step 4: Animate CTA button
      workflow.pushStep(new Step({
        name: 'Animate CTA',
        type: StepTypes.ACTION,
        callable: async () => {
          console.log('Animating CTA button...');
          await animate(ctaButton, 'fadeInUp', 800);
        }
      }));
      
      // Track progress
      workflow.events.on('STEP_COMPLETED', (data) => {
        const stepName = data.step.state.get('name');
        console.log(`✓ ${stepName}`);
      });
      
      workflow.events.on('WORKFLOW_COMPLETED', () => {
        console.log('Entrance animation complete!');
        pauseBtn.disabled = false;
      });
      
      return workflow;
    }
    
    // Create ambient particle workflow (loops indefinitely)
    function createAmbientParticlesWorkflow() {
      const workflow = new Workflow({
        name: 'Ambient Particles'
      });
      
      const particleStep = new Step({
        name: 'Create Particle',
        type: StepTypes.ACTION,
        callable: async () => {
          const x = Math.random() * window.innerWidth;
          const y = Math.random() * window.innerHeight;
          createParticle(x, y);
        }
      });
      
      const delayStep = new DelayStep({
        name: 'Particle Delay',
        delay_duration: 200,
        delay_type: DelayTypes.RELATIVE
      });
      
      const miniWorkflow = new Workflow({
        name: 'Particle Creation',
        steps: [particleStep, delayStep]
      });
      
      let iterations = 0;
      const loopStep = new LoopStep({
        name: 'Particle Loop',
        callable: miniWorkflow,
        subject: () => iterations < 20,
        operator: '===',
        value: true,
        loop_type: LoopTypes.WHILE,
        max_iterations: 20
      });
      
      workflow.pushStep(loopStep);
      
      return workflow;
    }
    
    // Start animation
    async function startAnimation() {
      // Reset all elements
      title.style.opacity = '0';
      title.style.transform = 'translateY(-50px)';
      title.style.animation = 'none';
      
      subtitle.style.opacity = '0';
      subtitle.style.transform = 'translateY(-30px)';
      subtitle.style.animation = 'none';
      
      features.forEach(feature => {
        feature.style.opacity = '0';
        feature.style.transform = 'scale(0.8)';
        feature.style.animation = 'none';
      });
      
      ctaButton.style.opacity = '0';
      ctaButton.style.transform = 'translateY(20px)';
      ctaButton.style.animation = 'none';
      
      pauseBtn.disabled = true;
      resumeBtn.disabled = true;
      
      console.log('Starting animation sequence...');
      
      mainWorkflow = createEntranceWorkflow();
      
      try {
        await mainWorkflow.execute();
        
        // Start ambient particles
        const ambientWorkflow = createAmbientParticlesWorkflow();
        ambientWorkflow.execute();
        
      } catch (error) {
        console.error('Animation error:', error);
      }
    }
    
    // Control handlers
    restartBtn.addEventListener('click', () => {
      startAnimation();
    });
    
    pauseBtn.addEventListener('click', () => {
      if (mainWorkflow) {
        mainWorkflow.pause();
        pauseBtn.disabled = true;
        resumeBtn.disabled = false;
        console.log('Animation paused');
      }
    });
    
    resumeBtn.addEventListener('click', async () => {
      if (mainWorkflow) {
        resumeBtn.disabled = true;
        pauseBtn.disabled = false;
        console.log('Animation resumed');
        await mainWorkflow.resume();
      }
    });
    
    // CTA button interaction
    ctaButton.addEventListener('click', () => {
      // Create explosion effect
      const rect = ctaButton.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      for (let i = 0; i < 30; i++) {
        setTimeout(() => createParticle(centerX, centerY), i * 20);
      }
      
      alert('🎉 Welcome to Micro Flow!');
    });
    
    // Start on load
    window.addEventListener('load', () => {
      setTimeout(startAnimation, 500);
    });
  </script>
</body>
</html>
```

## Key Features

1. **Staggered Animations** - Elements animate in sequence with delays
2. **Particle System** - Dynamic particle effects synchronized with animations
3. **Pause/Resume** - Control animation flow in real-time
4. **Looping Workflows** - Continuous ambient effects
5. **Event-Driven** - DOM animations triggered by workflow events
6. **Delay Steps** - Precise timing control between animations

## Animation Patterns

### Sequential with Delays
```javascript
workflow.pushSteps([
  animationStep1,
  new DelayStep({ delay_duration: 200, delay_type: DelayTypes.RELATIVE }),
  animationStep2
]);
```

### Staggered Entrance
```javascript
elements.forEach((el, i) => {
  if (i > 0) {
    workflow.pushStep(new DelayStep({ delay_duration: 150 }));
  }
  workflow.pushStep(new Step({
    callable: async () => await animate(el, 'fadeIn')
  }));
});
```

### Looping Animations
```javascript
const loopStep = new LoopStep({
  callable: animationWorkflow,
  subject: () => shouldContinue,
  operator: '===',
  value: true,
  loop_type: LoopTypes.WHILE
});
```

## Use Cases

- Landing page animations
- Tutorial walkthroughs
- Game UI sequences
- Loading animations
- Interactive presentations
- Scroll-triggered effects

## See Also

- [Delay Steps](../../step-types/delay-step.md)
- [Loop Steps](../../step-types/loop-step.md)
- [Workflows](../../core-concepts/workflows.md)
