import * as React from 'react';
import { ControllerRenderProps } from 'react-hook-form';

import {
  Select as SelectComponent,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { FormField } from '@/shared/types/blocks/form';

import { stringValue } from './value';

export function Select({
  field,
  formField,
}: {
  field: FormField;
  formField: ControllerRenderProps<Record<string, unknown>, string>;
  data?: unknown;
}) {
  return (
    <SelectComponent
      value={stringValue(formField.value)}
      onValueChange={formField.onChange}
      defaultValue={typeof field.value === 'string' ? field.value : undefined}
      {...field.attributes}
    >
      <SelectTrigger className="bg-background w-full rounded-md">
        <SelectValue placeholder={field.placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-background rounded-md">
        {field.options?.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.title}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectComponent>
  );
}
