'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useRouter } from '@/core/i18n/navigation';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { Button } from '@/shared/components/ui/button';
import {
  Form as FormComponent,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  FormField as FormFieldType,
  FormInputValues,
  FormSubmit,
  FormValue,
  FormValues,
} from '@/shared/types/blocks/form';

import { Checkbox } from './checkbox';
import { Input } from './input';
import { Markdown } from './markdown';
import { Select } from './select';
import { Switch } from './switch';
import { UploadImage } from './upload-image';
import { initialFieldValue, inputValue } from './value';

function buildFieldSchema(field: FormFieldType): z.ZodType<FormValue> {
  if (field.type === 'switch') {
    return z.boolean();
  }

  if (field.type === 'number') {
    // Accept both number (from initial data) and string (from input onChange)
    let schema = z.union([z.number(), z.string()]);

    if (field.validation?.required) {
      schema = schema.refine(
        (val) => {
          if (val === null || val === undefined || val === '') {
            return false;
          }
          return true;
        },
        {
          message: field.validation.message || `${field.title} is required`,
        }
      );
    }

    // Validate that the value can be converted to a valid number
    schema = schema.refine(
      (val) => {
        const num = typeof val === 'number' ? val : Number(val);
        return !isNaN(num) && isFinite(num);
      },
      {
        message:
          field.validation?.message || `${field.title} must be a valid number`,
      }
    );

    // Apply min validation if specified
    if (field.validation?.min !== undefined) {
      schema = schema.refine(
        (val) => {
          const num = typeof val === 'number' ? val : Number(val);
          return num >= field.validation!.min!;
        },
        {
          message:
            field.validation?.message ||
            `${field.title} must be at least ${field.validation.min}`,
        }
      );
    }

    // Apply max validation if specified
    if (field.validation?.max !== undefined) {
      schema = schema.refine(
        (val) => {
          const num = typeof val === 'number' ? val : Number(val);
          return num <= field.validation!.max!;
        },
        {
          message:
            field.validation?.message ||
            `${field.title} must be at most ${field.validation.max}`,
        }
      );
    }

    return schema;
  }

  if (
    field.type === 'upload_image' &&
    field.metadata?.max &&
    field.metadata.max > 1
  ) {
    let arraySchema = z.array(z.string());

    if (field.validation?.required) {
      arraySchema = arraySchema.min(1, {
        message: field.validation.message || `${field.title} is required`,
      });
    }

    return arraySchema;
  }

  if (field.type === 'checkbox') {
    const schema = z.array(z.string());

    return schema;
  }

  if (field.type === 'upload_image') {
    let schema = z.string();

    if (field.validation?.required) {
      schema = schema.min(1, {
        message: field.validation.message || `${field.title} is required`,
      });
    }

    return schema;
  }

  let schema = z.string();

  if (field.validation?.required) {
    schema = schema.min(1, {
      message: field.validation.message || `${field.title} is required`,
    });
  }

  if (field.validation?.min) {
    schema = schema.min(field.validation.min, {
      message:
        field.validation.message ||
        `${field.title} must be at least ${field.validation.min} characters`,
    });
  }

  if (field.validation?.max) {
    schema = schema.max(field.validation.max, {
      message:
        field.validation.message ||
        `${field.title} must be at most ${field.validation.max} characters`,
    });
  }

  if (field.validation?.email) {
    schema = schema.email({
      message:
        field.validation.message || `${field.title} must be a valid email`,
    });
  }

  return schema;
}

const generateFormSchema = (fields: FormFieldType[]) => {
  const schemaFields: Record<string, z.ZodType<FormValue>> = {};

  fields.forEach((field) => {
    if (field.name) {
      schemaFields[field.name] = buildFieldSchema(field);
    }
  });

  return z.object(schemaFields);
};

export function Form({
  title,
  description,
  fields: suppliedFields,
  data,
  passby,
  submit,
}: {
  title?: string;
  description?: string;
  fields?: FormFieldType[];
  data?: unknown;
  passby?: unknown;
  submit?: FormSubmit;
}) {
  const fields = suppliedFields || [];

  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const FormSchema = generateFormSchema(fields);
  const defaultValues: FormInputValues = {};

  fields.forEach((field) => {
    if (field.name) {
      const initialValue = initialFieldValue(data, field.name);
      if (field.type === 'switch') {
        const val = initialValue ?? field.value;
        defaultValues[field.name] =
          val === true || val === 'true' || val === 1 || val === '1';
      } else if (
        field.type === 'upload_image' &&
        field.metadata?.max &&
        field.metadata.max > 1
      ) {
        // Multiple image upload: default value is an array
        const val = initialValue ?? field.value;
        if (typeof val === 'string' && val) {
          // If it's a comma-separated string, convert to array
          defaultValues[field.name] = val.split(',').filter(Boolean);
        } else if (Array.isArray(val)) {
          defaultValues[field.name] = val;
        } else {
          defaultValues[field.name] = [];
        }
      } else if (field.type === 'checkbox') {
        const val = initialValue ?? field.value;
        if (typeof val === 'string' && val) {
          try {
            const parsed: unknown = JSON.parse(val);
            defaultValues[field.name] = Array.isArray(parsed) ? parsed : [];
          } catch {
            defaultValues[field.name] = [];
          }
        } else if (Array.isArray(val)) {
          defaultValues[field.name] = val;
        } else {
          defaultValues[field.name] = [];
        }
      } else if (field.type === 'number') {
        // Convert number to string for input fields (HTML inputs always return strings)
        const val = initialValue ?? field.value;
        defaultValues[field.name] =
          val !== null && val !== undefined ? String(val) : '';
      } else {
        defaultValues[field.name] = initialValue || field.value || '';
      }
    }
  });

  const form = useForm<FormInputValues, unknown, FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues,
  });

  async function onSubmit(data: FormValues) {
    if (!submit?.handler) return;

    try {
      const formData = new FormData();

      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      });

      setLoading(true);
      const res = await submit.handler(formData, passby);

      if (!res) {
        throw new Error('No response received from server');
      }

      if (res.message) {
        if (res.status === 'success') {
          toast.success(res.message);
        } else {
          toast.error(res.message);
        }
      }

      if (res.redirect_url) {
        router.push(res.redirect_url);
      }

      setLoading(false);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error && err.message ? err.message : 'submit form failed'
      );
      setLoading(false);
    }
  }

  return (
    <FormComponent {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full space-y-0 pb-2 md:max-w-xl"
      >
        {/* {title && <h2 className="text-lg font-bold">{title}</h2>}
        {description && <p className="text-muted-foreground">{description}</p>} */}
        <div className="mb-6 space-y-6">
          {fields.map((item, index) => {
            return (
              <FormField
                key={index}
                control={form.control}
                name={item.name || ''}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {item.title}
                      {item.validation?.required && (
                        <span className="ml-1 text-red-500">*</span>
                      )}
                    </FormLabel>
                    <FormControl>
                      {item.type === 'textarea' ? (
                        <Textarea
                          {...field}
                          value={inputValue(field.value)}
                          placeholder={item.placeholder}
                          {...item.attributes}
                        />
                      ) : item.type === 'select' ? (
                        <Select field={item} formField={field} data={data} />
                      ) : item.type === 'switch' ? (
                        <Switch field={item} formField={field} data={data} />
                      ) : item.type === 'checkbox' ? (
                        <Checkbox field={item} formField={field} data={data} />
                      ) : item.type === 'markdown_editor' ? (
                        <Markdown field={item} formField={field} data={data} />
                      ) : item.type === 'upload_image' ? (
                        <UploadImage
                          field={item}
                          formField={field}
                          data={data}
                          metadata={item.metadata}
                        />
                      ) : (
                        <Input field={item} formField={field} data={data} />
                      )}
                    </FormControl>
                    {item.tip && (
                      <FormDescription
                        dangerouslySetInnerHTML={{ __html: item.tip }}
                      />
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          })}
        </div>
        {submit?.button && (
          <Button
            type="submit"
            variant={submit.button.variant}
            className="flex cursor-pointer items-center justify-center gap-2 font-semibold"
            disabled={loading}
            size={submit.button.size || 'sm'}
          >
            {loading ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              submit.button.icon && (
                <SmartIcon
                  name={submit.button.icon as string}
                  className="size-4"
                />
              )
            )}
            {submit.button.title}
          </Button>
        )}
      </form>
    </FormComponent>
  );
}

export * from './form-card';
