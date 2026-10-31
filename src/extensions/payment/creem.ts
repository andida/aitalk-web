import { errorMessage } from '@/shared/lib/error-message';

import {
  CheckoutSession,
  PaymentBilling,
  PaymentConfigs,
  PaymentCustomField,
  PaymentEvent,
  PaymentEventType,
  PaymentInterval,
  PaymentOrder,
  PaymentProvider,
  PaymentSession,
  PaymentStatus,
  SubscriptionCycleType,
  SubscriptionInfo,
  SubscriptionStatus,
} from './types';

type CreemCustomer = { id?: string; email?: string; name?: string };
type CreemOrder = {
  id?: string;
  status?: string;
  description?: string;
  amount?: number;
  currency?: string;
  transaction?: string;
  discount_amount?: number;
  amount_paid?: number;
  created_at?: string;
};
type CreemProduct = {
  id?: string;
  description?: string;
  price?: number;
  currency?: string;
  billing_period?: string;
};
type CreemSubscription = {
  id: string;
  status?: string;
  created_at?: string;
  current_period_start_date?: string;
  current_period_end_date?: string;
  canceled_at?: string;
  cancel_at?: string;
  metadata?: Record<string, unknown>;
  product?: CreemProduct;
  customer?: CreemCustomer;
  order?: CreemOrder;
};
type CreemSession = {
  id?: string;
  status?: string;
  created_at?: string;
  current_period_start_date?: string;
  current_period_end_date?: string;
  canceled_at?: string;
  cancel_at?: string;
  metadata?: Record<string, unknown>;
  order?: CreemOrder;
  last_transaction?: CreemOrder;
  subscription?: CreemSubscription;
  product?: CreemProduct;
  customer?: CreemCustomer;
};

function parseCreemEvent(value: unknown): {
  eventType: string;
  object: Record<string, unknown>;
  raw: Record<string, unknown>;
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid webhook payload');
  }
  const event = value as Record<string, unknown>;
  if (typeof event.eventType !== 'string' || !event.eventType) {
    throw new Error('Invalid webhook payload');
  }
  const object = event.object;
  if (!object || typeof object !== 'object' || Array.isArray(object)) {
    throw new Error('Invalid webhook event object');
  }
  return { eventType: event.eventType, object: object as Record<string, unknown>, raw: event };
}

/**
 * Creem payment provider configs
 * @docs https://docs.creem.io/
 */
export interface CreemConfigs extends PaymentConfigs {
  apiKey: string;
  signingSecret?: string;
  environment?: 'sandbox' | 'production';
}

/**
 * Creem payment provider implementation
 * @website https://creem.io/
 */
export class CreemProvider implements PaymentProvider {
  readonly name = 'creem';
  configs: CreemConfigs;

  private baseUrl: string;

  constructor(configs: CreemConfigs) {
    this.configs = configs;
    this.baseUrl =
      configs.environment === 'production'
        ? 'https://api.creem.io'
        : 'https://test-api.creem.io';
  }

  // create payment
  async createPayment({
    order,
  }: {
    order: PaymentOrder;
  }): Promise<CheckoutSession> {
    try {
      if (!order.productId) {
        throw new Error('productId is required');
      }

      // build payment payload
      const payload = {
        product_id: order.productId,
        request_id: order.requestId || undefined,
        units: 1,
        discount_code: order.discount
          ? {
              code: order.discount.code,
            }
          : undefined,
        customer: order.customer
          ? {
              id: order.customer.id,
              email: order.customer.email,
            }
          : undefined,
        custom_fields: order.customFields
          ? order.customFields.map((customField: PaymentCustomField) => ({
              type: customField.type,
              key: customField.name,
              label: customField.label,
              optional: !customField.isRequired as boolean,
              text: customField.metadata,
            }))
          : undefined,
        success_url: order.successUrl,
        metadata: order.metadata,
      };

      const result = await this.makeRequest('/v1/checkouts', 'POST', payload);

      // create payment failed
      if (result.error) {
        throw new Error(result.error.message || 'create payment failed');
      }

      // create payment success
      return {
        provider: this.name,
        checkoutParams: payload,
        checkoutInfo: {
          sessionId: result.id,
          checkoutUrl: result.checkout_url,
        },
        checkoutResult: result,
        metadata: order.metadata || {},
      };
    } catch (error) {
      throw error;
    }
  }

  // get payment by session id
  // @docs https://docs.creem.io/api-reference/endpoint/get-checkout
  async getPaymentSession({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<PaymentSession> {
    try {
      // retrieve payment
      const session = await this.makeRequest(
        `/v1/checkouts?checkout_id=${sessionId}`,
        'GET'
      );

      if (!session.id || !session.order) {
        throw new Error(session.error || 'get payment failed');
      }

      return await this.buildPaymentSessionFromCheckoutSession(session);
    } catch (error) {
      throw error;
    }
  }

  async getPaymentEvent({ req }: { req: Request }): Promise<PaymentEvent> {
    try {
      const rawBody = await req.text();
      const signature = req.headers.get('creem-signature') as string;

      if (!rawBody || !signature) {
        throw new Error('Invalid webhook request');
      }

      if (!this.configs.signingSecret) {
        throw new Error('Signing Secret not configured');
      }

      const computedSignature = await this.generateSignature(
        rawBody,
        this.configs.signingSecret
      );

      if (computedSignature !== signature) {
        throw new Error('Invalid webhook signature');
      }

      // parse the webhook payload
      const rawEvent: unknown = JSON.parse(rawBody);
      const event = parseCreemEvent(rawEvent);

      let paymentSession: PaymentSession | undefined = undefined;

      const eventType = this.mapCreemEventType(event.eventType);

      if (eventType === PaymentEventType.CHECKOUT_SUCCESS) {
        paymentSession = await this.buildPaymentSessionFromCheckoutSession(
          event.object as CreemSession
        );
      } else if (eventType === PaymentEventType.PAYMENT_SUCCESS) {
        paymentSession = await this.buildPaymentSessionFromInvoice(
          event.object as CreemSession
        );
      } else if (eventType === PaymentEventType.SUBSCRIBE_UPDATED) {
        paymentSession = await this.buildPaymentSessionFromSubscription(
          event.object as CreemSubscription
        );
      } else if (eventType === PaymentEventType.SUBSCRIBE_CANCELED) {
        paymentSession = await this.buildPaymentSessionFromSubscription(
          event.object as CreemSubscription
        );
      }

      if (!paymentSession) {
        throw new Error('Invalid webhook event');
      }

      return {
        eventType: eventType,
        eventResult: event.raw,
        paymentSession: paymentSession,
      };
    } catch (error) {
      throw error;
    }
  }

  async getPaymentBilling({
    customerId,
    returnUrl,
  }: {
    customerId: string;
    returnUrl?: string;
  }): Promise<PaymentBilling> {
    try {
      const billing = await this.makeRequest('/v1/customers/billing', 'POST', {
        customer_id: customerId,
      });

      if (!billing.customer_portal_link) {
        throw new Error('get billing url failed');
      }

      return {
        billingUrl: billing.customer_portal_link,
      };
    } catch (error) {
      throw error;
    }
  }

  async cancelSubscription({
    subscriptionId,
  }: {
    subscriptionId: string;
  }): Promise<PaymentSession> {
    try {
      const result = await this.makeRequest(
        `/v1/subscriptions/${subscriptionId}/cancel`,
        'POST'
      );

      if (!result.canceled_at) {
        throw new Error('cancel subscription failed');
      }

      return await this.buildPaymentSessionFromSubscription(result);
    } catch (error) {
      throw error;
    }
  }

  private async generateSignature(
    payload: string,
    secret: string
  ): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const messageData = encoder.encode(payload);

      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign('HMAC', key, messageData);

      const signatureArray = new Uint8Array(signature);
      return Array.from(signatureArray)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error: unknown) {
      throw new Error(`Failed to generate signature: ${errorMessage(error, 'unknown error')}`);
    }
  }

  private async makeRequest(endpoint: string, method: string, data?: unknown) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'x-api-key': this.configs.apiKey,
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      method,
      headers,
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(url, config);
    if (!response.ok) {
      throw new Error(
        `request creem api failed with status: ${response.status}`
      );
    }

    return await response.json();
  }

  private mapCreemEventType(eventType: string): PaymentEventType {
    switch (eventType) {
      case 'checkout.completed':
        return PaymentEventType.CHECKOUT_SUCCESS;
      case 'subscription.paid':
        return PaymentEventType.PAYMENT_SUCCESS;
      case 'subscription.update':
        return PaymentEventType.SUBSCRIBE_UPDATED;
      case 'subscription.paused':
        return PaymentEventType.SUBSCRIBE_UPDATED;
      case 'subscription.active':
        return PaymentEventType.SUBSCRIBE_UPDATED;
      case 'subscription.canceled':
        return PaymentEventType.SUBSCRIBE_CANCELED;
      default:
        // not handle other event type
        // subscription.expired
        // subscription.trialing
        // refund.created
        // dispute.created
        throw new Error(`Not handle creem event type: ${eventType}`);
    }
  }

  private mapCreemStatus(session: CreemSession): PaymentStatus {
    const status = session.status;
    const order = session.order || session.last_transaction;
    const orderStatus = order?.status;

    if (orderStatus === 'paid') {
      return PaymentStatus.SUCCESS;
    } else {
      // todo: handle other status
      throw new Error(`Unknown Creem session status: ${status}`);
    }
  }

  // build payment session from checkout session
  private async buildPaymentSessionFromCheckoutSession(
    session: CreemSession
  ): Promise<PaymentSession> {
    let subscription: CreemSubscription | undefined = undefined;
    const billingUrl = '';

    if (session.subscription) {
      subscription = session.subscription;
    }

    const order = session.order;

    const result: PaymentSession = {
      provider: this.name,
      paymentStatus: this.mapCreemStatus(session),
      paymentInfo: {
        transactionId: order?.transaction || order?.id,
        amount: order?.amount || 0,
        currency: order?.currency || '',
        discountCode: '',
        discountAmount: order?.discount_amount || 0,
        discountCurrency: order?.currency || '',
        paymentAmount: order?.amount_paid || 0,
        paymentCurrency: order?.currency || '',
        paymentEmail: session.customer?.email,
        paymentUserName: session.customer?.name,
        paymentUserId: session.customer?.id,
        paidAt: order?.created_at ? new Date(order.created_at) : undefined,
        invoiceId: '', // todo: invoice id
        invoiceUrl: '',
      },
      paymentResult: session,
      metadata: session.metadata,
    };

    if (subscription) {
      result.subscriptionId = subscription.id;
      result.subscriptionInfo = await this.buildSubscriptionInfo(
        subscription,
        session.product
      );
      result.subscriptionResult = subscription;
    }

    return result;
  }

  // build payment session from subscription session
  private async buildPaymentSessionFromInvoice(
    invoice: CreemSession
  ): Promise<PaymentSession> {
    const order = invoice.order || invoice.last_transaction;

    const subscription = invoice.subscription || invoice;

    const subscriptionCreatedAt = new Date(subscription.created_at || Date.now());
    const currentPeriodStartAt = new Date(
      subscription.current_period_start_date || Date.now()
    );
    const timeDiff =
      currentPeriodStartAt.getTime() - subscriptionCreatedAt.getTime();

    const cycleType =
      timeDiff < 5000 // 5s
        ? SubscriptionCycleType.CREATE
        : SubscriptionCycleType.RENEWAL;

    const result: PaymentSession = {
      provider: this.name,
      paymentStatus: this.mapCreemStatus(invoice),
      paymentInfo: {
        description: order?.description,
        amount: order?.amount || 0,
        currency: order?.currency || '',
        transactionId: order?.transaction || order?.id,
        discountCode: '',
        discountAmount: order?.discount_amount || 0,
        discountCurrency: order?.currency || '',
        paymentAmount: order?.amount_paid || 0,
        paymentCurrency: order?.currency || '',
        paymentEmail: invoice.customer?.email,
        paymentUserName: invoice.customer?.name,
        paymentUserId: invoice.customer?.id,
        paidAt: order?.created_at ? new Date(order.created_at) : undefined,
        invoiceId: '', // todo: invoice id
        invoiceUrl: '',
        subscriptionCycleType: cycleType,
      },
      paymentResult: invoice,
      metadata: invoice.metadata,
    };

    if (subscription) {
      result.subscriptionId = subscription.id;
      result.subscriptionInfo = await this.buildSubscriptionInfo(
        subscription,
        subscription.product
      );
      result.subscriptionResult = subscription;
    }

    return result;
  }

  // build payment session from subscription
  private async buildPaymentSessionFromSubscription(
    subscription: CreemSubscription
  ): Promise<PaymentSession> {
    const result: PaymentSession = {
      provider: this.name,
    };

    if (subscription) {
      result.subscriptionId = subscription.id;
      result.subscriptionInfo = await this.buildSubscriptionInfo(
        subscription,
        subscription.product
      );
      result.subscriptionResult = subscription;
    }

    return result;
  }

  // build subscription info from subscription
  private async buildSubscriptionInfo(
    subscription: CreemSubscription | CreemSession,
    product?: CreemProduct
  ): Promise<SubscriptionInfo> {
    const { interval, count: intervalCount } = this.mapCreemInterval(product);

    const subscriptionInfo: SubscriptionInfo = {
      subscriptionId: subscription.id ?? '',
      productId: product?.id,
      planId: '',
      description: product?.description,
      amount: product?.price,
      currency: product?.currency,
      currentPeriodStart: new Date(
        subscription.current_period_start_date || Date.now()
      ),
      currentPeriodEnd: new Date(
        subscription.current_period_end_date || Date.now()
      ),
      interval: interval,
      intervalCount: intervalCount,
      metadata: subscription.metadata,
    };

    if (subscription.status === 'active') {
      if (subscription.cancel_at) {
        subscriptionInfo.status = SubscriptionStatus.PENDING_CANCEL;
        // cancel apply at
        subscriptionInfo.canceledAt = new Date(
          subscription.canceled_at || Date.now()
        );
      } else {
        subscriptionInfo.status = SubscriptionStatus.ACTIVE;
      }
    } else if (subscription.status === 'canceled') {
      // subscription canceled
      subscriptionInfo.status = SubscriptionStatus.CANCELED;
      subscriptionInfo.canceledAt = new Date(
        subscription.canceled_at || Date.now()
      );
    } else if (subscription.status === 'trialing') {
      subscriptionInfo.status = SubscriptionStatus.TRIALING;
    } else if (subscription.status === 'paused') {
      subscriptionInfo.status = SubscriptionStatus.PAUSED;
    } else {
      throw new Error(
        `Unknown Creem subscription status: ${subscription.status}`
      );
    }

    return subscriptionInfo;
  }

  private mapCreemInterval(product?: CreemProduct): {
    interval: PaymentInterval;
    count: number;
  } {
    if (!product || !product.billing_period) {
      throw new Error('Invalid product');
    }

    switch (product.billing_period) {
      case 'every-month':
        return {
          interval: PaymentInterval.MONTH,
          count: 1,
        };
      case 'every-three-months':
        return {
          interval: PaymentInterval.MONTH,
          count: 3,
        };
      case 'every-six-months':
        return {
          interval: PaymentInterval.MONTH,
          count: 6,
        };
      case 'every-year':
        return {
          interval: PaymentInterval.YEAR,
          count: 1,
        };
      case 'once':
        return {
          interval: PaymentInterval.ONE_TIME,
          count: 1,
        };
      default:
        throw new Error(
          `Unknown Creem product billing period: ${product.billing_period}`
        );
    }
  }
}

/**
 * Create Creem provider with configs
 */
export function createCreemProvider(configs: CreemConfigs): CreemProvider {
  return new CreemProvider(configs);
}
