import { ControllerRenderProps } from 'react-hook-form';

import { Input as InputComponent } from '@/shared/components/ui/input';
import { FormField } from '@/shared/types/blocks/form';

import { inputValue } from './value';

export function Input({
  field,
  formField,
}: {
  field: FormField;
  formField: ControllerRenderProps<Record<string, unknown>, string>;
  data?: unknown;
}) {
  return (
    <InputComponent
      value={inputValue(formField.value)}
      onChange={formField.onChange}
      type={field.type || 'text'}
      placeholder={field.placeholder}
      className="bg-background placeholder:text-base-content/50 rounded-md"
      {...field.attributes}
    />
  );
}
