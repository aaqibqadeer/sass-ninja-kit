import type { ReactNode } from "react";

import { EmptyState } from "@/components/shared/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface DataTableColumn<T> {
  /** Stable key for the column. */
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  /** Rendered when `rows` is empty (defaults to a simple EmptyState). */
  empty?: ReactNode;
}

/**
 * Thin, generic table over the `Table` primitive (Phase 7, §9). Columns declare
 * a header + a `cell` renderer (which can return actions/badges), so admin lists
 * reuse one table instead of hand-rolling `<table>` each time.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  empty,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <>{empty ?? <EmptyState title="Nothing here yet." />}</>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key} className={column.className}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={getRowKey(row)}>
            {columns.map((column) => (
              <TableCell key={column.key} className={column.className}>
                {column.cell(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
