import { useState, type ChangeEvent } from 'react';

export function usePagination(defaultRowsPerPage = 10) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  function paginate<T>(rows: T[]): T[] {
    const start = page * rowsPerPage;
    return rows.slice(start, start + rowsPerPage);
  }

  function handleChangePage(_: unknown, newPage: number) {
    setPage(newPage);
  }

  function handleChangeRowsPerPage(event: ChangeEvent<HTMLInputElement>) {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }

  return { page, rowsPerPage, paginate, handleChangePage, handleChangeRowsPerPage };
}
