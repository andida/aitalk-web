import type { ReactNode } from 'react';

import type { Button, Pagination } from './common';

export type TableScalar = string | number | bigint | boolean | null | undefined;

// Only display fields belong in table cells; a database User is not a client DTO.
export interface TableUser {
  name: string;
  email: string;
  image?: string | null;
}

export interface TableAction {
  id?: string;
  name?: string;
  title?: string;
  url?: string;
  target?: string;
  icon?: string;
  className?: string;
  size?: Button['size'];
  variant?: Button['variant'];
}

export interface ImageMetadata {
  width?: number;
  height?: number;
}

export interface TimeMetadata {
  format?: string;
}

export interface LabelMetadata {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export interface CopyMetadata {
  message?: string;
}

type RowKey<Row> = Extract<keyof Row, string>;
type ValueKey<Row, Value> = {
  [Key in RowKey<Row>]-?: Row[Key] extends Value | null | undefined
    ? Key
    : never;
}[RowKey<Row>];

type RenderCell<Row> = (item: Row) => ReactNode;
type ActionResult = readonly TableAction[] | null | undefined;

interface ColumnPresentation {
  title?: string;
  placeholder?: string;
  className?: string;
}

type ValueColumn<Row, Value> = {
  name?: ValueKey<Row, Value>;
  // These renderers retain the original value-first behavior of typed cells.
  callback?: RenderCell<Row>;
};

type PlainColumn<Row> = {
  type?: undefined;
  metadata?: never;
} & (
  | { name?: ValueKey<Row, TableScalar>; callback?: undefined }
  | { name?: RowKey<Row>; callback: RenderCell<Row> }
);

export type TableColumn<Row extends object> = ColumnPresentation &
  (
    | PlainColumn<Row>
    | (ValueColumn<Row, string> & {
        type: 'image';
        metadata?: ImageMetadata;
      })
    | (ValueColumn<Row, string | number | Date> & {
        type: 'time';
        metadata?: TimeMetadata;
      })
    | (ValueColumn<Row, TableScalar> & {
        type: 'label';
        metadata?: LabelMetadata;
      })
    | (ValueColumn<Row, TableScalar> & {
        type: 'copy';
        metadata?: CopyMetadata;
      })
    | (ValueColumn<Row, TableUser> & {
        type: 'user';
        metadata?: never;
      })
    | (ValueColumn<Row, TableScalar> & {
        type: 'json_preview';
        metadata?: never;
      })
    | {
        name?: ValueKey<Row, readonly TableAction[]>;
        type: 'dropdown';
        metadata?: never;
        callback?: (item: Row) => ActionResult | Promise<ActionResult>;
      }
  );

export interface Table<Row extends object> {
  title?: string;
  columns: readonly TableColumn<Row>[];
  data: readonly Row[];
  emptyMessage?: string;
  pagination?: Pagination;
  actions?: Button[];
}
