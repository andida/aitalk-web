import type { ReactNode } from 'react';
import { Trash } from 'lucide-react';

import {
  TableBody,
  TableCell,
  Table as TableComponent,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { type Pagination } from '@/shared/types/blocks/common';
import { type TableColumn } from '@/shared/types/blocks/table';

import { Copy } from './copy';
import { Dropdown } from './dropdown';
import { Image as TableImage } from './image';
import { JsonPreview } from './json-preview';
import { Label } from './label';
import { Time } from './time';
import { User } from './user';
import { actionValues, ownValue, scalarValue } from './value';

function renderCell<Row extends object>(
  row: Row,
  column: TableColumn<Row>,
): ReactNode {
  const value =
    column.name === undefined ? undefined : ownValue(row, column.name);
  const props = {
    placeholder: column.placeholder,
    className: column.className,
  };

  if (column.type === 'dropdown') {
    const renderActions = (actions: unknown) => (
      <Dropdown {...props} value={actionValues(actions)} />
    );
    const actions = column.callback
      ? column.callback(row)
      : actionValues(value);
    // Only the returned value's array brand check may recover from a revoked
    // Proxy. Callback errors, action limits and Promise rejections must escape.
    let isActionArray: boolean;
    try {
      isActionArray = Array.isArray(actions);
    } catch {
      return renderActions(undefined);
    }
    // Resolve on the server before passing the finite DTO to a client component.
    return actions == null || isActionArray
      ? renderActions(actions)
      : Promise.resolve(actions).then(renderActions);
  }

  // Invoke callbacks once, in row/column order, including the typed cells whose
  // original contract displays the raw field instead of the callback result.
  const content = column.callback ? column.callback(row) : scalarValue(value);
  switch (column.type) {
    case 'image':
      return <TableImage {...props} value={value} metadata={column.metadata} />;
    case 'time':
      return <Time {...props} value={value} metadata={column.metadata} />;
    case 'label':
      return <Label {...props} value={value} metadata={column.metadata} />;
    case 'user':
      return <User {...props} value={value} />;
    case 'json_preview':
      return <JsonPreview {...props} value={value} />;
    case 'copy': {
      const text = scalarValue(value);
      if (text) {
        const message = ownValue(column.metadata, 'message');
        return (
          <Copy
            {...props}
            value={String(text)}
            metadata={typeof message === 'string' ? { message } : undefined}
          >
            {content}
          </Copy>
        );
      }
    }
  }
  // Preserve the distinction between synchronous falsy content and a truthy
  // Promise that React will resolve later (e.g. async () => 0).
  return content || column.placeholder;
}

export function Table<Row extends object>({
  columns: suppliedColumns,
  data,
  emptyMessage,
}: {
  columns?: readonly TableColumn<Row>[];
  data?: readonly Row[];
  emptyMessage?: string;
  pagination?: Pagination;
}) {
  const columns = suppliedColumns || [];

  return (
    <TableComponent className="w-full">
      <TableHeader className="">
        <TableRow className="rounded-md">
          {columns.map((item, idx) => (
            <TableHead key={idx} className={item.className}>
              {item.title}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data && data.length > 0 ? (
          data.map((item, idx) => (
            <TableRow key={idx} className="h-16">
              {columns.map((column, iidx) => (
                <TableCell key={iidx} className={column.className}>
                  {renderCell(item, column)}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow className="">
            <TableCell colSpan={columns.length}>
              <div className="text-muted-foreground flex w-full items-center justify-center py-8">
                {emptyMessage ? (
                  <p>{emptyMessage}</p>
                ) : (
                  <Trash className="h-10 w-10" />
                )}
              </div>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </TableComponent>
  );
}

export * from './table-card';
