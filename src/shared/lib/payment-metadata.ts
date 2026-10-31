/** Read a local order identifier from untrusted provider metadata. */
export function paymentOrderNumber(metadata: unknown): string | undefined {
  try {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return undefined;
    }
    if (!Object.prototype.hasOwnProperty.call(metadata, 'order_no')) {
      return undefined;
    }
    const orderNo: unknown = Reflect.get(metadata, 'order_no');
    return typeof orderNo === 'string' && orderNo ? orderNo : undefined;
  } catch {
    return undefined;
  }
}
