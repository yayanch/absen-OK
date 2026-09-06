import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 25, 50, 100],
}) => {
  const validTotalItems = Number.isFinite(totalItems) && totalItems >= 0 ? totalItems : 0;
  const validPageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 5;
  const validCurrentPage = Number.isFinite(currentPage) && currentPage > 0 ? currentPage : 1;
  const validTotalPages = Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1;

  if (validTotalItems === 0) return null;

  const startItem = Math.max(1, (validCurrentPage - 1) * validPageSize + 1);
  const endItem = Math.min(validCurrentPage * validPageSize, validTotalItems);

  // Generate page numbers with smart ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (validTotalPages <= 7) {
      for (let i = 1; i <= validTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (validCurrentPage > 3) pages.push('...');
      
      const start = Math.max(2, validCurrentPage - 1);
      const end = Math.min(validTotalPages - 1, validCurrentPage + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (validCurrentPage < validTotalPages - 2) pages.push('...');
      pages.push(validTotalPages);
    }
    return pages;
  };

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
      {/* Items range & page size selector */}
      <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-400 font-medium">
        <div className="flex items-center gap-2">
          <span>Tampilkan</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="py-1 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span>per halaman</span>
        </div>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <div>
          Menampilkan <span className="font-bold text-slate-800 dark:text-slate-200">{startItem}</span> -{' '}
          <span className="font-bold text-slate-800 dark:text-slate-200">{endItem}</span> dari{' '}
          <span className="font-bold text-blue-600 dark:text-blue-400">{validTotalItems}</span> data
        </div>
      </div>

      {/* Pagination buttons */}
      {validTotalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={validCurrentPage <= 1}
            onClick={() => onPageChange(validCurrentPage - 1)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-slate-800 disabled:cursor-not-allowed transition"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="px-2 text-slate-400 font-bold">
                  ...
                </span>
              );
            }
            const isCurrent = p === validCurrentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(p as number)}
                className={`min-w-[32px] h-8 px-2.5 rounded-lg text-xs font-bold transition ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {p}
              </button>
            );
          })}

          <button
            type="button"
            disabled={validCurrentPage >= validTotalPages}
            onClick={() => onPageChange(validCurrentPage + 1)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-slate-800 disabled:cursor-not-allowed transition"
            title="Halaman Selanjutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
