import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Failure, Loading } from '@/components/remote';

export function PageGuard({
  queries,
  children,
}: {
  queries: UseQueryResult<unknown>[];
  children: ReactNode;
}) {
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);

  if (isLoading) {
    return (
      <div className="page">
        <Loading />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="page">
        <Failure retry={() => void Promise.all(queries.map((q) => q.refetch()))} />
      </div>
    );
  }

  return <>{children}</>;
}
