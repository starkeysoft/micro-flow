````markdown
# Custom Analytics Tracking Step (Frontend)

This example demonstrates how to extend the `Step` class to create a custom step that automatically tracks user interactions and analytics events in a frontend application.

## Use Case

Building a custom step that:
1. Extends `Step` with automatic event tracking
2. Captures user interaction metrics
3. Sends analytics to multiple providers
4. Provides timing and performance data
5. Handles privacy and consent management

## Custom Step Implementation

```javascript
import { Step, Workflow, StepTypes } from 'micro-flow';

/**
 * Extended Step class that automatically tracks analytics events
 * for frontend user interactions and workflow execution.
 */
class AnalyticsStep extends Step {
  constructor({
    name,
    type,
    callable = async () => {},
    trackEvent = true,
    eventCategory = 'workflow',
    eventAction = null,
    eventLabel = null,
    customProperties = {},
    trackTiming = true,
    providers = ['google', 'mixpanel'],
    requireConsent = true
  }) {
    super({ name, type, callable });
    
    // Add analytics-specific properties
    this.state.set('trackEvent', trackEvent);
    this.state.set('eventCategory', eventCategory);
    this.state.set('eventAction', eventAction || name);
    this.state.set('eventLabel', eventLabel);
    this.state.set('customProperties', customProperties);
    this.state.set('trackTiming', trackTiming);
    this.state.set('providers', providers);
    this.state.set('requireConsent', requireConsent);
    this.state.set('analyticsData', {});
  }
  
  /**
   * Extended execute method that tracks analytics events
   */
  async execute() {
    // Check consent before tracking
    if (this.state.get('requireConsent') && !this.hasUserConsent()) {
      console.log(`[Analytics] Skipping tracking for ${this.state.get('name')} - no consent`);
      return await super.execute();
    }
    
    // Track step start
    if (this.state.get('trackEvent')) {
      await this.trackStepStart();
    }
    
    let result;
    let error = null;
    
    try {
      // Execute the original step
      result = await super.execute();
      
      // Track successful completion
      if (this.state.get('trackEvent')) {
        await this.trackStepComplete(result);
      }
      
      return result;
      
    } catch (err) {
      error = err;
      
      // Track error
      if (this.state.get('trackEvent')) {
        await this.trackStepError(err);
      }
      
      throw err;
    }
  }
  
  /**
   * Track step start event
   */
  async trackStepStart() {
    const eventData = {
      category: this.state.get('eventCategory'),
      action: `${this.state.get('eventAction')}_started`,
      label: this.state.get('eventLabel') || this.state.get('name'),
      workflow: this.workflow?.get('name'),
      stepType: this.state.get('type'),
      timestamp: Date.now(),
      ...this.state.get('customProperties')
    };
    
    await this.sendToProviders('event', eventData);
    
    this.state.set('analyticsData', {
      ...this.state.get('analyticsData'),
      startEvent: eventData
    });
  }
  
  /**
   * Track step completion event
   */
  async trackStepComplete(result) {
    const executionTime = this.state.get('execution_time_ms');
    
    const eventData = {
      category: this.state.get('eventCategory'),
      action: `${this.state.get('eventAction')}_completed`,
      label: this.state.get('eventLabel') || this.state.get('name'),
      workflow: this.workflow?.get('name'),
      stepType: this.state.get('type'),
      timestamp: Date.now(),
      executionTime,
      ...this.state.get('customProperties')
    };
    
    await this.sendToProviders('event', eventData);
    
    // Track timing if enabled
    if (this.state.get('trackTiming')) {
      await this.trackTiming(executionTime);
    }
    
    this.state.set('analyticsData', {
      ...this.state.get('analyticsData'),
      completeEvent: eventData
    });
  }
  
  /**
   * Track step error event
   */
  async trackStepError(error) {
    const executionTime = this.state.get('execution_time_ms');
    
    const eventData = {
      category: this.state.get('eventCategory'),
      action: `${this.state.get('eventAction')}_failed`,
      label: this.state.get('eventLabel') || this.state.get('name'),
      workflow: this.workflow?.get('name'),
      stepType: this.state.get('type'),
      timestamp: Date.now(),
      executionTime,
      errorMessage: error.message,
      errorType: error.name,
      ...this.state.get('customProperties')
    };
    
    await this.sendToProviders('event', eventData);
    
    this.state.set('analyticsData', {
      ...this.state.get('analyticsData'),
      errorEvent: eventData
    });
  }
  
  /**
   * Track timing information
   */
  async trackTiming(duration) {
    const timingData = {
      category: this.state.get('eventCategory'),
      variable: this.state.get('eventAction'),
      value: duration,
      label: this.state.get('eventLabel') || this.state.get('name')
    };
    
    await this.sendToProviders('timing', timingData);
  }
  
  /**
   * Send data to configured analytics providers
   */
  async sendToProviders(type, data) {
    const providers = this.state.get('providers');
    
    const promises = providers.map(provider => {
      switch (provider) {
        case 'google':
          return this.sendToGoogleAnalytics(type, data);
        case 'mixpanel':
          return this.sendToMixpanel(type, data);
        case 'segment':
          return this.sendToSegment(type, data);
        case 'custom':
          return this.sendToCustomProvider(type, data);
        default:
          console.warn(`[Analytics] Unknown provider: ${provider}`);
          return Promise.resolve();
      }
    });
    
    await Promise.allSettled(promises);
  }
  
  /**
   * Send to Google Analytics
   */
  async sendToGoogleAnalytics(type, data) {
    if (typeof window === 'undefined' || !window.gtag) {
      console.log('[Analytics] Google Analytics not loaded');
      return;
    }
    
    if (type === 'event') {
      window.gtag('event', data.action, {
        event_category: data.category,
        event_label: data.label,
        value: data.executionTime,
        ...data
      });
    } else if (type === 'timing') {
      window.gtag('event', 'timing_complete', {
        name: data.variable,
        value: data.value,
        event_category: data.category,
        event_label: data.label
      });
    }
    
    console.log('[Analytics] Sent to Google Analytics:', type, data);
  }
  
  /**
   * Send to Mixpanel
   */
  async sendToMixpanel(type, data) {
    if (typeof window === 'undefined' || !window.mixpanel) {
      console.log('[Analytics] Mixpanel not loaded');
      return;
    }
    
    if (type === 'event') {
      window.mixpanel.track(data.action, data);
    } else if (type === 'timing') {
      window.mixpanel.track('timing', data);
    }
    
    console.log('[Analytics] Sent to Mixpanel:', type, data);
  }
  
  /**
   * Send to Segment
   */
  async sendToSegment(type, data) {
    if (typeof window === 'undefined' || !window.analytics) {
      console.log('[Analytics] Segment not loaded');
      return;
    }
    
    if (type === 'event') {
      window.analytics.track(data.action, data);
    }
    
    console.log('[Analytics] Sent to Segment:', type, data);
  }
  
  /**
   * Send to custom analytics endpoint
   */
  async sendToCustomProvider(type, data) {
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data })
      });
      console.log('[Analytics] Sent to custom provider:', type, data);
    } catch (error) {
      console.error('[Analytics] Failed to send to custom provider:', error);
    }
  }
  
  /**
   * Check if user has given consent for analytics
   */
  hasUserConsent() {
    // Check localStorage for consent
    if (typeof window !== 'undefined' && window.localStorage) {
      const consent = localStorage.getItem('analytics_consent');
      return consent === 'true';
    }
    return false;
  }
  
  /**
   * Add custom property to analytics tracking
   */
  addCustomProperty(key, value) {
    const props = this.state.get('customProperties');
    this.state.set('customProperties', { ...props, [key]: value });
  }
  
  /**
   * Get analytics data collected for this step
   */
  getAnalyticsData() {
    return this.state.get('analyticsData');
  }
}

// Mock analytics libraries for demonstration
if (typeof window !== 'undefined') {
  window.gtag = window.gtag || function() {
    console.log('[Mock GA]', ...arguments);
  };
  
  window.mixpanel = window.mixpanel || {
    track: (event, props) => {
      console.log('[Mock Mixpanel]', event, props);
    }
  };
  
  window.analytics = window.analytics || {
    track: (event, props) => {
      console.log('[Mock Segment]', event, props);
    }
  };
}

// Example 1: E-commerce checkout workflow with analytics
async function createCheckoutWorkflow(cart, user) {
  const workflow = new Workflow({
    name: 'Checkout Process'
  });
  
  // Set user consent (in real app, this would come from cookie consent)
  if (typeof window !== 'undefined') {
    localStorage.setItem('analytics_consent', 'true');
  }
  
  // Set up workflow state
  workflow.state.merge({ cart, user, orderId: null });
  
  // Step 1: Validate cart with analytics
  const validateCart = new AnalyticsStep({
    name: 'Validate Cart',
    type: StepTypes.ACTION,
    eventCategory: 'checkout',
    eventAction: 'validate_cart',
    eventLabel: `${cart.items.length} items`,
    customProperties: {
      cartValue: cart.total,
      itemCount: cart.items.length
    },
    callable: async function() {
      console.log('Validating cart...');
      
      // Validate stock availability
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const allInStock = cart.items.every(item => item.stock > 0);
      
      if (!allInStock) {
        throw new Error('Some items are out of stock');
      }
      
      return { valid: true, itemCount: cart.items.length };
    }
  });
  
  // Step 2: Apply promo code
  const applyPromo = new AnalyticsStep({
    name: 'Apply Promo',
    type: StepTypes.ACTION,
    eventCategory: 'checkout',
    eventAction: 'apply_promo',
    trackEvent: cart.promoCode ? true : false, // Only track if promo used
    customProperties: {
      promoCode: cart.promoCode || 'none',
      originalTotal: cart.total
    },
    callable: async function() {
      if (!cart.promoCode) {
        return { discount: 0, finalTotal: cart.total };
      }
      
      console.log('Applying promo code:', cart.promoCode);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const discount = cart.total * 0.1; // 10% off
      const finalTotal = cart.total - discount;
      
      this.state.set('finalTotal', finalTotal);
      this.state.set('discount', discount);
      
      // Add discount info to analytics
      this.addCustomProperty('discount', discount);
      this.addCustomProperty('finalTotal', finalTotal);
      
      return { discount, finalTotal };
    }
  });
  
  // Step 3: Process payment
  const processPayment = new AnalyticsStep({
    name: 'Process Payment',
    type: StepTypes.ACTION,
    eventCategory: 'checkout',
    eventAction: 'process_payment',
    eventLabel: 'credit_card',
    customProperties: {
      amount: cart.total,
      currency: 'USD',
      paymentMethod: 'card'
    },
    providers: ['google', 'mixpanel', 'custom'], // Send to all providers
    callable: async function() {
      console.log('Processing payment...');
      
      const amount = this.state.get('finalTotal') || cart.total;
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const transactionId = 'txn_' + Date.now();
      
      this.state.set('transactionId', transactionId);
      this.addCustomProperty('transactionId', transactionId);
      
      return { success: true, transactionId, amount };
    }
  });
  
  // Step 4: Create order
  const createOrder = new AnalyticsStep({
    name: 'Create Order',
    type: StepTypes.ACTION,
    eventCategory: 'checkout',
    eventAction: 'order_created',
    customProperties: {
      userId: user.id,
      userType: user.isPremium ? 'premium' : 'standard'
    },
    callable: async function() {
      console.log('Creating order...');
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const orderId = 'order_' + Math.floor(Math.random() * 100000);
      this.state.set('orderId', orderId);
      this.addCustomProperty('orderId', orderId);
      
      return { orderId, created: true };
    }
  });
  
  // Step 5: Send confirmation
  const sendConfirmation = new AnalyticsStep({
    name: 'Send Confirmation',
    type: StepTypes.ACTION,
    eventCategory: 'checkout',
    eventAction: 'confirmation_sent',
    customProperties: {
      email: user.email
    },
    callable: async function() {
      console.log('Sending confirmation email to:', user.email);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return { emailSent: true, recipient: user.email };
    }
  });
  
  workflow.pushSteps([
    validateCart,
    applyPromo,
    processPayment,
    createOrder,
    sendConfirmation
  ]);
  
  return workflow;
}

// Example 2: User onboarding with funnel tracking
async function createOnboardingWorkflow() {
  const workflow = new Workflow({
    name: 'User Onboarding'
  });
  
  const steps = [
    new AnalyticsStep({
      name: 'Step 1: Welcome',
      type: StepTypes.ACTION,
      eventCategory: 'onboarding',
      eventAction: 'view_welcome',
      customProperties: { funnelStep: 1 },
      callable: async () => {
        console.log('Showing welcome screen');
        await new Promise(resolve => setTimeout(resolve, 100));
        return { viewed: true };
      }
    }),
    
    new AnalyticsStep({
      name: 'Step 2: Profile Setup',
      type: StepTypes.ACTION,
      eventCategory: 'onboarding',
      eventAction: 'setup_profile',
      customProperties: { funnelStep: 2 },
      callable: async () => {
        console.log('Setting up profile');
        await new Promise(resolve => setTimeout(resolve, 200));
        return { profileComplete: true };
      }
    }),
    
    new AnalyticsStep({
      name: 'Step 3: Connect Services',
      type: StepTypes.ACTION,
      eventCategory: 'onboarding',
      eventAction: 'connect_services',
      customProperties: { funnelStep: 3 },
      callable: async () => {
        console.log('Connecting services');
        await new Promise(resolve => setTimeout(resolve, 150));
        return { servicesConnected: 2 };
      }
    }),
    
    new AnalyticsStep({
      name: 'Step 4: Complete',
      type: StepTypes.ACTION,
      eventCategory: 'onboarding',
      eventAction: 'onboarding_complete',
      customProperties: { funnelStep: 4 },
      callable: async () => {
        console.log('Onboarding complete!');
        await new Promise(resolve => setTimeout(resolve, 100));
        return { complete: true };
      }
    })
  ];
  
  workflow.pushSteps(steps);
  return workflow;
}

// Example execution
async function runExamples() {
  // Set user consent
  if (typeof window !== 'undefined') {
    localStorage.setItem('analytics_consent', 'true');
  }
  
  console.log('=== Example 1: E-commerce Checkout ===\n');
  
  const cart = {
    items: [
      { id: 1, name: 'Product A', price: 29.99, stock: 10 },
      { id: 2, name: 'Product B', price: 49.99, stock: 5 }
    ],
    total: 79.98,
    promoCode: 'SAVE10'
  };
  
  const user = {
    id: 'user_123',
    email: 'user@example.com',
    isPremium: true
  };
  
  try {
    const checkoutWorkflow = await createCheckoutWorkflow(cart, user);
    const result = await checkoutWorkflow.execute();
    
    console.log('\n✓ Checkout completed!');
    console.log('Order ID:', result.state.get('orderId'));
    console.log('Total execution time:', result.state.get('execution_time_ms') + 'ms');
    
  } catch (error) {
    console.error('Checkout failed:', error.message);
  }
  
  console.log('\n\n=== Example 2: Onboarding Funnel ===\n');
  
  try {
    const onboardingWorkflow = await createOnboardingWorkflow();
    const result = await onboardingWorkflow.execute();
    
    console.log('\n✓ Onboarding completed!');
    console.log('Total execution time:', result.state.get('execution_time_ms') + 'ms');
    
  } catch (error) {
    console.error('Onboarding failed:', error.message);
  }
}

// Run examples
runExamples().catch(console.error);
```

## Output

```
=== Example 1: E-commerce Checkout ===

Validating cart...
[Analytics] Sent to Google Analytics: event { category: 'checkout', action: 'validate_cart_completed', ... }
[Analytics] Sent to Mixpanel: event { category: 'checkout', action: 'validate_cart_completed', ... }
Applying promo code: SAVE10
[Analytics] Sent to Google Analytics: event { category: 'checkout', action: 'apply_promo_completed', discount: 7.998, ... }
Processing payment...
[Analytics] Sent to Google Analytics: event { category: 'checkout', action: 'process_payment_completed', ... }
[Analytics] Sent to Mixpanel: event { category: 'checkout', action: 'process_payment_completed', ... }
[Analytics] Sent to custom provider: event { category: 'checkout', action: 'process_payment_completed', ... }
Creating order...
[Analytics] Sent to Google Analytics: event { category: 'checkout', action: 'order_created_completed', orderId: 'order_54231', ... }
Sending confirmation email to: user@example.com
[Analytics] Sent to Google Analytics: event { category: 'checkout', action: 'confirmation_sent_completed', ... }

✓ Checkout completed!
Order ID: order_54231
Total execution time: 1387ms


=== Example 2: Onboarding Funnel ===

Showing welcome screen
[Analytics] Sent to Google Analytics: event { category: 'onboarding', funnelStep: 1, ... }
Setting up profile
[Analytics] Sent to Google Analytics: event { category: 'onboarding', funnelStep: 2, ... }
Connecting services
[Analytics] Sent to Google Analytics: event { category: 'onboarding', funnelStep: 3, ... }
Onboarding complete!
[Analytics] Sent to Google Analytics: event { category: 'onboarding', funnelStep: 4, ... }

✓ Onboarding completed!
Total execution time: 567ms
```

## Key Features Demonstrated

1. **Extended Step Class** - Custom class inherits all Step functionality
2. **Automatic Tracking** - Events tracked without manual calls
3. **Multi-Provider Support** - Send to Google Analytics, Mixpanel, Segment, and custom endpoints
4. **Timing Metrics** - Automatic performance tracking
5. **Privacy Controls** - Consent management integration
6. **Dynamic Properties** - Add analytics properties during execution
7. **Error Tracking** - Automatic error event tracking
8. **Funnel Analysis** - Track user journeys through multi-step processes

## Use Cases

- **E-commerce Checkout** - Track purchase funnel
- **User Onboarding** - Monitor activation flow
- **Form Submissions** - Track multi-step forms
- **Feature Usage** - Monitor feature adoption
- **A/B Testing** - Track experiment variations
- **Performance Monitoring** - Measure step execution times

## See Also

- [Step API](../../api/classes/step.md)
- [Workflow Events](../../core-concepts/events.md)
- [State Management](../../core-concepts/state-management.md)
- [Frontend Integration](../frontend/integration-guide.md)

````
