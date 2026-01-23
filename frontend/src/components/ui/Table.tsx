import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState, EmptyBoxIcon } from './EmptyState';

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  keyExtractor?: (item: T) => string | number;
}

export function Table<T extends object>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  keyExtractor,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<EmptyBoxIcon />}
        title={emptyMessage}
      />
    );
  }

  const getKey = (item: T, index: number): string | number => {
    if (keyExtractor) {
      return keyExtractor(item);
    }
    if ('id' in item && (typeof item.id === 'string' || typeof item.id === 'number')) {
      return item.id;
    }
    return index;
  };

  const getCellValue = (item: T, column: TableColumn<T>): React.ReactNode => {
    if (column.render) {
      return column.render(item);
    }
    const value = (item as Record<string, unknown>)[column.key];
    if (value === null || value === undefined) {
      return '-';
    }
    return String(value);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, index) => (
            <tr
              key={getKey(item, index)}
              className="hover:bg-gray-50 transition-colors"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap"
                >
                  {getCellValue(item, column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
