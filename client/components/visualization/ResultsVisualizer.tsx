"use client";

import React, { useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { Download, Table as TableIcon, BarChart3, Hash, ChevronLeft, ChevronRight } from 'lucide-react';
import { downloadCSV } from '@/lib/csv-export';

interface ResultData {
    type: 'scalar' | 'aggregation' | 'table';
    data: any[];
    visualizationType: 'metric' | 'bar' | 'table';
    columnOrder?: string[];
}

interface ResultsVisualizerProps {
    result: ResultData | null;
}

const PAGE_SIZE = 25;

export const ResultsVisualizer: React.FC<ResultsVisualizerProps> = ({ result }) => {
    const [currentPage, setCurrentPage] = useState(1);

    if (!result) return null;

    const { visualizationType, data } = result;
    const rowCount = data.length;
    const totalPages = Math.ceil(rowCount / PAGE_SIZE);
    const showPagination = rowCount > PAGE_SIZE;

    const handleDownload = () => {
        const timestamp = new Date().toISOString().split('T')[0];
        downloadCSV(data, `results_${timestamp}.csv`, result.columnOrder);
    };

    const handlePreviousPage = () => {
        setCurrentPage((prev) => Math.max(1, prev - 1));
    };

    const handleNextPage = () => {
        setCurrentPage((prev) => Math.min(totalPages, prev + 1));
    };

    // Reset to page 1 when result changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [result]);

    if (visualizationType === 'metric') {
        // Handle both uppercase and lowercase 'value' key
        const value = data[0]?.value ?? data[0]?.VALUE ?? Object.values(data[0])?.[0];
        
        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                    <Hash className="w-4 h-4" />
                    <span>Result Set (1 row)</span>
                </div>
                <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
                    <div className="text-4xl font-bold text-blue-600">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </div>
                </div>
            </div>
        );
    }

    if (visualizationType === 'bar') {
        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                        <BarChart3 className="w-4 h-4" />
                        <span>Result Set ({rowCount} rows)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Export</span>
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold bg-white border border-gray-300 text-green-700 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <span>CSV</span>
                            <Download className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200 h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{
                                top: 5,
                                right: 30,
                                left: 20,
                                bottom: 5,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="category" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    if (visualizationType === 'table') {
        if (data.length === 0) return <div className="p-4">No data found.</div>;
        const headers = result.columnOrder || Object.keys(data[0]);

        // Paginate data
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        const endIndex = Math.min(startIndex + PAGE_SIZE, rowCount);
        const paginatedData = data.slice(startIndex, endIndex);

        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                        <TableIcon className="w-4 h-4" />
                        <span>Result Set ({rowCount} rows)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Export</span>
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold bg-white border border-gray-300 text-green-700 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <span>CSV</span>
                            <Download className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {headers.map((header) => (
                                    <th
                                        key={header}
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    {headers.map((header) => (
                                        <td key={`${idx}-${header}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {row[header]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {showPagination && (
                    <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>Showing {startIndex + 1} to {endIndex} of {rowCount} results</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePreviousPage}
                                disabled={currentPage === 1}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Previous
                            </button>
                            <span className="text-sm text-gray-600">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return <div>Unsupported visualization type</div>;
};
