export interface FlatPaginatedData<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    total?: number;
  };
}

export function normalizePaginated<T>(
  data: FlatPaginatedData<T> & Record<string, unknown>,
): PaginatedData<T> & Record<string, unknown> {
  const { items, nextCursor, hasMore, total, ...rest } = data;

  return {
    ...rest,
    items,
    pagination: {
      nextCursor,
      hasMore,
      ...(total !== undefined ? { total } : {}),
    },
  };
}
