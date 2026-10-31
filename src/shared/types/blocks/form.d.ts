import type {
  AriaAttributes,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

import { Button } from './common';

// Initial values are untrusted until the field schema has parsed them.
export type FormInputValues = Record<string, unknown>;
export type FormValue = string | number | boolean | string[];
export type FormValues = Record<string, FormValue>;

// Serializable attributes shared by the dynamic controls. Control-specific
// callbacks and values belong to the control, not an untyped property bag.
export type FormFieldAttributes = AriaAttributes &
  Pick<
    InputHTMLAttributes<HTMLInputElement>,
    | 'id'
    | 'name'
    | 'className'
    | 'style'
    | 'title'
    | 'disabled'
    | 'readOnly'
    | 'required'
    | 'type'
    | 'placeholder'
    | 'autoComplete'
    | 'autoFocus'
    | 'tabIndex'
    | 'inputMode'
    | 'min'
    | 'max'
    | 'step'
    | 'minLength'
    | 'maxLength'
    | 'pattern'
    | 'accept'
    | 'multiple'
    | 'form'
    | 'list'
  > &
  Pick<TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows' | 'cols' | 'wrap'> & {
    [name: `data-${string}`]: string | number | boolean | null | undefined;
  };

export interface FormFieldMetadata {
  max?: number;
  maxSizeMB?: number;
  [name: string]: unknown;
}

type ValidationRule = {
  required?: boolean;
  min?: number;
  max?: number;
  message?: string;
  email?: boolean;
};

export interface FormField {
  name?: string;
  title?: string;
  type?:
    | 'text'
    | 'textarea'
    | 'number'
    | 'email'
    | 'password'
    | 'select'
    | 'url'
    | 'editor'
    | 'code_editor'
    | 'richtext_editor'
    | 'markdown_editor'
    | 'switch'
    | 'checkbox'
    | 'upload_image';
  placeholder?: string;
  group?: string;
  options?: {
    title: string;
    value: string;
    description?: string | null;
  }[];
  value?: unknown;
  tip?: string;
  attributes?: FormFieldAttributes;
  validation?: ValidationRule;
  metadata?: FormFieldMetadata;
}

export interface FormSubmit {
  input?: FormField;
  button?: Button;
  action?: string;
  handler?: (
    data: FormData,
    passby?: unknown
  ) => Promise<
    | {
        status: 'success' | 'error';
        message: string;
        redirect_url?: string;
      }
    | undefined
    | void
  >;
}

export interface Form {
  title?: string;
  description?: string;
  fields: FormField[];
  data?: unknown;
  passby?: unknown;
  submit?: FormSubmit;
}
