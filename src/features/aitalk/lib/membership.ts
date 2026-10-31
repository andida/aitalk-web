// Presentation only. Never use this label to authorize paid features.
export function membershipLabel(
  usage: { vip_status?: unknown; vipStatus?: unknown } | null | undefined,
  locale: string
): string {
  const status = usage?.vip_status ?? usage?.vipStatus;
  const zh = locale === 'zh';
  if (status === 'active') return zh ? '会员有效' : 'Active';
  if (status === 'expired') return zh ? '已过期' : 'Expired';
  return zh ? '暂时无法确认，请稍后刷新' : 'Unable to confirm — refresh later';
}
