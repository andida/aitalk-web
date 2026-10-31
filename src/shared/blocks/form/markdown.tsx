import { ControllerRenderProps } from 'react-hook-form';

import { FormField } from '@/shared/types/blocks/form';

import { MarkdownEditor } from '../common/markdown-editor';
import { stringValue } from './value';

export function Markdown({
  field,
  formField,
}: {
  field: FormField;
  formField: ControllerRenderProps<Record<string, unknown>, string>;
  data?: unknown;
}) {
  return (
    <MarkdownEditor
      value={stringValue(formField.value)}
      onChange={formField.onChange}
      placeholder={field.placeholder || ''}
      {...field.attributes}
    />
  );
}
