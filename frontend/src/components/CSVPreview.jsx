import React, { useState, useEffect } from 'react';
import { Eye, X, Users, FileText, CheckCircle } from 'lucide-react';

const CSVPreview = ({ data, columns, onClose, totalRows }) => {
    if (!data || !columns || !totalRows) return null;

    const [rowsToShow, setRowsToShow] = useState(5);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setRowsToShow(10)
            } else {
                setRowsToShow(5); 
            }
        };
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const hasEmailColumn = columns.some(col => col.toLowerCase().trim() === 'email');

    const displayColumns = columns.slice(0, 4);
    const remainingColumns = columns.length - displayColumns.length;

    const currentRowsDisplayed = Math.min(rowsToShow, data.length);
    const remainingEmails = totalRows - currentRowsDisplayed;

    return (
        <div className="w-full bg-white/70 backdrop-blur-sm border border-gray-200 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-md dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">

            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center">
                    <Eye className="mr-2 text-blue-600 dark:text-blue-400" size={20} />
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Contact Preview
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            First {currentRowsDisplayed} rows • {totalRows} total Emails
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                    aria-label="Close preview"
                    title="Close preview"
                >
                    <X size={18} />
                </button>
            </div>

            <div className="px-6 py-3 bg-gray-50/70 dark:bg-gray-800/30 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-6">
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <Users className="mr-2" size={16} />
                            <span className="font-semibold text-gray-900 dark:text-white">{totalRows}</span>
                            <span className="ml-1">Emails</span>
                        </div>
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <FileText className="mr-2" size={16} />
                            <span className="font-semibold text-gray-900 dark:text-white">{columns.length}</span>
                            <span className="ml-1">columns</span>
                        </div>
                    </div>
                    <div className="flex items-center">
                        {hasEmailColumn ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800">
                                <CheckCircle className="mr-1" size={12} />
                                Email column found
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                                ⚠ No email column
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-gray-50/70 dark:bg-gray-800/50 sticky top-0 z-10">
                        <tr>
                            {displayColumns.map((column, idx) => (
                                <th key={idx} className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                                    <div className="flex items-center">
                                        {column.toLowerCase() === 'email' && (
                                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 flex-shrink-0"></span>
                                        )}
                                        <span className="truncate">{column}</span>
                                    </div>
                                </th>
                            ))}
                            {remainingColumns > 0 && (
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                                    <span className="text-gray-400">+{remainingColumns} more</span>
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white/50 dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-700">
                        {data.slice(0, rowsToShow).map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                {displayColumns.map((column, colIdx) => (
                                    <td key={colIdx} className="px-4 py-3 text-sm border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                                        <div className="truncate max-w-32" title={row[column] || '-'}>
                                            {row[column] ? (
                                                <span className={`${column.toLowerCase() === 'email' ? 'font-medium text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                                    {row[column]}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 dark:text-gray-500 italic">-</span>
                                            )}
                                        </div>
                                    </td>
                                ))}
                                {remainingColumns > 0 && (
                                    <td className="px-4 py-3 text-center text-xs text-gray-400 dark:text-gray-500">
                                        <span className="text-gray-300 dark:text-gray-600">...</span>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="px-6 py-4 bg-gray-50/70 dark:bg-gray-800/30 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4 text-gray-500 dark:text-gray-400">
                        <span>Showing {currentRowsDisplayed} of {totalRows} rows</span>
                        <span>•</span>
                        <span>Displaying {displayColumns.length} of {columns.length} columns</span>
                    </div>
                    {remainingEmails > 0 && (
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                            {remainingEmails} more Emails available
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CSVPreview;