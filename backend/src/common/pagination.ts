const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export type PaginationParams = {
  limit: number;
  cursor?: string;
};

export type CursorPaginationResult<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

export function parsePaginationParams(query: {
  limit?: string;
  cursor?: string;
}): PaginationParams {
  const parsedLimit = Number(query.limit ?? DEFAULT_LIMIT);

  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

  const cursor = typeof query.cursor === 'string' && query.cursor.length > 0
    ? query.cursor
    : undefined;

  return { limit, cursor };
}

export function buildCursorPaginationResult<T extends { id: string }>(
  rows: T[],
  limit: number,
): CursorPaginationResult<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

  return { items, nextCursor, hasMore };
}