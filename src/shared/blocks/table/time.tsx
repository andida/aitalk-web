import moment from 'moment';
import { useLocale } from 'next-intl';

import { ownValue, timeValue } from './value';

export function Time({
  value: suppliedValue,
  placeholder,
  metadata,
  className,
}: {
  value: unknown;
  placeholder?: string;
  metadata?: unknown;
  className?: string;
}) {
  let locale = useLocale();
  const value = timeValue(suppliedValue);
  const format = ownValue(metadata, 'format');
  if (!value) {
    if (placeholder) {
      return <div className={className}>{placeholder}</div>;
    }

    return null;
  }

  if (locale === 'zh') {
    locale = 'zh-cn';
  }

  return (
    <div className={className}>
      {typeof format === 'string' && format
        ? moment(value).locale(locale).format(format)
        : moment(value).locale(locale).fromNow()}
    </div>
  );
}
