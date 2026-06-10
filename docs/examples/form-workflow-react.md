# Multi-Step Form — React

Demonstrates managing a multi-step checkout form with `Workflow`, `Step`, `ConditionalStep`, and the event system inside a React component. Each form page maps to a step; `State` stores validated field values; events drive the React UI.

## Overview

You will learn:
- Mapping form pages to `Step` instances in a `Workflow`
- Using `ConditionalStep` to branch on validation results
- Storing validated form data in `State` and reading it in React
- Using workflow and step events to drive `useState` / `useReducer`
- Submitting the assembled form data from a final step
- Proper cleanup of event listeners in `useEffect`

## Complete Example

```jsx
// CheckoutForm.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Workflow,
  Step,
  ConditionalStep,
  State,
  workflow_event_names,
  step_event_names,
} from '@ronaldroe/micro-flow';

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateContact(data) {
  const errors = {};
  if (!data.firstName?.trim()) errors.firstName = 'First name is required';
  if (!data.lastName?.trim())  errors.lastName  = 'Last name is required';
  if (!data.email?.includes('@')) errors.email  = 'Valid email is required';
  if (!data.phone?.match(/^\+?[\d\s\-()]{7,}$/)) errors.phone = 'Valid phone is required';
  return errors;
}

function validateShipping(data) {
  const errors = {};
  if (!data.address?.trim())  errors.address  = 'Address is required';
  if (!data.city?.trim())     errors.city     = 'City is required';
  if (!data.postcode?.trim()) errors.postcode = 'Postcode is required';
  if (!data.country?.trim())  errors.country  = 'Country is required';
  return errors;
}

function validatePayment(data) {
  const errors = {};
  if (!data.cardNumber?.replace(/\s/g, '').match(/^\d{16}$/)) {
    errors.cardNumber = 'Card number must be 16 digits';
  }
  if (!data.expiry?.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) {
    errors.expiry = 'Expiry must be MM/YY';
  }
  if (!data.cvv?.match(/^\d{3,4}$/)) {
    errors.cvv = 'CVV must be 3 or 4 digits';
  }
  return errors;
}

// ─── Step components ──────────────────────────────────────────────────────────

function ContactStep({ formData, onChange, errors }) {
  return (
    <div className="form-page">
      <h2>Contact Information</h2>
      {['firstName', 'lastName', 'email', 'phone'].map((field) => (
        <div key={field} className="field">
          <label>{field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</label>
          <input
            value={formData[field] ?? ''}
            onChange={(e) => onChange(field, e.target.value)}
            className={errors[field] ? 'error' : ''}
          />
          {errors[field] && <span className="error-msg">{errors[field]}</span>}
        </div>
      ))}
    </div>
  );
}

function ShippingStep({ formData, onChange, errors }) {
  return (
    <div className="form-page">
      <h2>Shipping Address</h2>
      {['address', 'city', 'postcode', 'country'].map((field) => (
        <div key={field} className="field">
          <label>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
          <input
            value={formData[field] ?? ''}
            onChange={(e) => onChange(field, e.target.value)}
            className={errors[field] ? 'error' : ''}
          />
          {errors[field] && <span className="error-msg">{errors[field]}</span>}
        </div>
      ))}
    </div>
  );
}

function PaymentStep({ formData, onChange, errors }) {
  return (
    <div className="form-page">
      <h2>Payment Details</h2>
      {[
        { key: 'cardNumber', label: 'Card Number', placeholder: '4111 1111 1111 1111' },
        { key: 'expiry',     label: 'Expiry (MM/YY)', placeholder: '12/27' },
        { key: 'cvv',        label: 'CVV', placeholder: '123' },
      ].map(({ key, label, placeholder }) => (
        <div key={key} className="field">
          <label>{label}</label>
          <input
            value={formData[key] ?? ''}
            placeholder={placeholder}
            onChange={(e) => onChange(key, e.target.value)}
            className={errors[key] ? 'error' : ''}
          />
          {errors[key] && <span className="error-msg">{errors[key]}</span>}
        </div>
      ))}
    </div>
  );
}

function ReviewStep() {
  const contact  = State.get('checkout.contact')  ?? {};
  const shipping = State.get('checkout.shipping') ?? {};
  const payment  = State.get('checkout.payment')  ?? {};

  return (
    <div className="form-page">
      <h2>Review Your Order</h2>
      <section>
        <h3>Contact</h3>
        <p>{contact.firstName} {contact.lastName}</p>
        <p>{contact.email} · {contact.phone}</p>
      </section>
      <section>
        <h3>Shipping</h3>
        <p>{shipping.address}</p>
        <p>{shipping.city}, {shipping.postcode} {shipping.country}</p>
      </section>
      <section>
        <h3>Payment</h3>
        <p>Card ending in {payment.cardNumber?.slice(-4) ?? '****'}</p>
      </section>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const PAGES = ['contact', 'shipping', 'payment', 'review'];

export default function CheckoutForm() {
  const [currentPage,    setCurrentPage]    = useState(0);
  const [fieldErrors,    setFieldErrors]    = useState({});
  const [formData,       setFormData]       = useState({});
  const [submitting,     setSubmitting]     = useState(false);
  const [submitError,    setSubmitError]    = useState(null);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [orderId,        setOrderId]        = useState(null);

  const workflowRef = useRef(null);

  // ── Field change handler ────────────────────────────────────────────────────

  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // ── Build the validation + submission workflow ──────────────────────────────

  function buildCheckoutWorkflow(page) {
    return new Workflow({
      name: `checkout-${PAGES[page]}`,
      exit_on_error: true,
      steps: [

        // Step 1: Validate the current page's data
        new ConditionalStep({
          name: 'validate-page',
          conditional: {
            subject: () => {
              const data = State.get(`checkout.draft.${PAGES[page]}`) ?? {};
              const validateFn = { contact: validateContact, shipping: validateShipping, payment: validatePayment }[PAGES[page]];
              return validateFn ? Object.keys(validateFn(data)).length : 0;
            },
            operator: '===',
            value: 0,
          },
          true_callable: async function () {
            // Validation passed — commit draft to final state
            const draft = this.getState(`checkout.draft.${PAGES[page]}`) ?? {};
            this.setState(`checkout.${PAGES[page]}`, draft);
            return { valid: true };
          },
          false_callable: async function () {
            // Validation failed — store errors
            const data = this.getState(`checkout.draft.${PAGES[page]}`) ?? {};
            const validateFn = { contact: validateContact, shipping: validateShipping, payment: validatePayment }[PAGES[page]];
            if (validateFn) {
              this.setState(`checkout.validationErrors.${PAGES[page]}`, validateFn(data));
            }
            throw new Error('Validation failed');
          },
        }),

        // Step 2: Submit (only on the review page)
        ...(page === 3
          ? [
              new Step({
                name: 'submit-order',
                max_retries: 2,
                max_timeout_ms: 15000,
                callable: async function () {
                  const payload = {
                    contact:  this.getState('checkout.contact'),
                    shipping: this.getState('checkout.shipping'),
                    payment:  {
                      last4:  this.getState('checkout.payment.cardNumber')?.slice(-4),
                      expiry: this.getState('checkout.payment.expiry'),
                    },
                    items: this.getState('checkout.cart') ?? [],
                  };

                  // Simulate order submission
                  await new Promise((r) => setTimeout(r, 800));

                  const orderId = `ORD-${Date.now()}`;
                  this.setState('checkout.orderId', orderId);
                  return { success: true, orderId };
                },
              }),
            ]
          : []),
      ],
    });
  }

  // ── Event wiring ────────────────────────────────────────────────────────────

  useEffect(() => {
    const wfEvents = State.get('events.workflow');

    const onComplete = (data) => {
      setSubmitting(false);
      const page = State.get('checkout.currentPage') ?? 0;

      if (page === 3) {
        // Order submitted
        const id = State.get('checkout.orderId');
        setOrderId(id);
        setOrderConfirmed(true);
      } else {
        // Move to next page
        const nextPage = page + 1;
        State.set('checkout.currentPage', nextPage);
        setCurrentPage(nextPage);
        setFieldErrors({});
      }
    };

    const onFailed = () => {
      setSubmitting(false);

      const page = State.get('checkout.currentPage') ?? 0;
      const errs = State.get(`checkout.validationErrors.${PAGES[page]}`) ?? {};
      setFieldErrors(errs);

      if (page === 3) {
        setSubmitError('Order submission failed. Please try again.');
      }
    };

    wfEvents.on(workflow_event_names.WORKFLOW_COMPLETE, onComplete);
    wfEvents.on(workflow_event_names.WORKFLOW_FAILED,   onFailed);

    return () => {
      wfEvents.off(workflow_event_names.WORKFLOW_COMPLETE, onComplete);
      wfEvents.off(workflow_event_names.WORKFLOW_FAILED,   onFailed);
    };
  }, []);

  // ── Advance / submit ────────────────────────────────────────────────────────

  async function handleNext() {
    setSubmitting(true);
    setSubmitError(null);

    // Write current page's draft data to state
    State.set(`checkout.draft.${PAGES[currentPage]}`, formData);
    State.set('checkout.currentPage', currentPage);

    const wf = buildCheckoutWorkflow(currentPage);
    workflowRef.current = wf;
    await wf.execute();
  }

  function handleBack() {
    setCurrentPage((p) => Math.max(0, p - 1));
    setFieldErrors({});
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (orderConfirmed) {
    return (
      <div className="checkout-confirmed">
        <h1>✓ Order Confirmed</h1>
        <p>Thank you for your order!</p>
        <p className="order-id">Order ID: <strong>{orderId}</strong></p>
        <button onClick={() => {
          setOrderConfirmed(false);
          setCurrentPage(0);
          setFormData({});
          State.reset();
        }}>
          Start New Order
        </button>
      </div>
    );
  }

  return (
    <div className="checkout-form">
      {/* Step progress indicator */}
      <div className="stepper">
        {PAGES.map((name, i) => (
          <div
            key={name}
            className={`stepper-item ${i < currentPage ? 'done' : ''} ${i === currentPage ? 'active' : ''}`}
          >
            <div className="stepper-dot">{i < currentPage ? '✓' : i + 1}</div>
            <span>{name.charAt(0).toUpperCase() + name.slice(1)}</span>
          </div>
        ))}
      </div>

      {/* Current page */}
      {currentPage === 0 && <ContactStep  formData={formData} onChange={handleChange} errors={fieldErrors} />}
      {currentPage === 1 && <ShippingStep formData={formData} onChange={handleChange} errors={fieldErrors} />}
      {currentPage === 2 && <PaymentStep  formData={formData} onChange={handleChange} errors={fieldErrors} />}
      {currentPage === 3 && <ReviewStep />}

      {submitError && <div className="submit-error">{submitError}</div>}

      {/* Navigation */}
      <div className="form-actions">
        {currentPage > 0 && (
          <button onClick={handleBack} disabled={submitting}>Back</button>
        )}
        <button
          onClick={handleNext}
          disabled={submitting}
          className="primary"
        >
          {submitting
            ? 'Processing…'
            : currentPage === PAGES.length - 1 ? 'Place Order' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
```

## Key Concepts

### ConditionalStep for Inline Validation

Each page's validation runs inside a `ConditionalStep`. The `subject` function re-reads draft data from `State` and counts the validation errors. If there are zero errors, the true branch commits the data; otherwise the false branch stores the error map and throws, triggering the workflow's failure path.

### State as Form Storage

`State.set('checkout.draft.contact', formData)` stores the current page's data before launching the workflow. After validation succeeds, the step commits it to `checkout.contact`. The `ReviewStep` component reads directly from `State` to render a summary.

### Event-Driven UI Transitions

`WORKFLOW_COMPLETE` advances the page counter. `WORKFLOW_FAILED` reads validation errors back from `State` and sets them on the React `fieldErrors` state, causing the form to highlight invalid fields.

### Cleanup in useEffect

Every `wfEvents.on()` call is matched with a `wfEvents.off()` in the `useEffect` cleanup function. This prevents stale handlers when the component re-renders or unmounts.

## Related Examples

- [Step Hopping — React](step-hopping-react.md) — Dynamic step manipulation in React
- [Data Fetching — Vue](data-fetching-vue.md) — Reactive data loading
- [Basic Workflow — Node.js](basic-workflow-node.md) — Core patterns
