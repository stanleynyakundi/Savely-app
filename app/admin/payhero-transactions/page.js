"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";

export default function PayHeroTransactionsPage() {
    const [transactions, setTransactions] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);

    useEffect(() => {
        fetchTransactions(page);
    }, [page]);

    const fetchTransactions = async (pageNumber) => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/admin/payhero-transactions?page=${pageNumber}&limit=15`);
            const data = await res.json();

            if (data.success) {
                setTransactions(data.transactions);
                setPagination(data.pagination);
            } else {
                setError(data.error || "Failed to load transactions");
            }
        } catch (err) {
            console.error("Error fetching transactions:", err);
            setError("An error occurred while fetching data.");
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (pagination.next_page) {
            setPage(pagination.next_page);
        }
    };

    const handlePrev = () => {
        if (pagination.prev_page) {
            setPage(pagination.prev_page);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-white">PayHero Transactions</h1>
                    <button
                        onClick={() => fetchTransactions(page)}
                        className="text-sm bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded"
                    >
                        Refresh
                    </button>
                </div>

                {error && (
                    <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {loading ? (
                    <p className="text-gray-400">Loading transactions...</p>
                ) : (
                    <div className="bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-700">
                                <thead className="bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Reference</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Wallet Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-gray-800 divide-y divide-gray-700">
                                    {transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-400">
                                                No transactions found.
                                            </td>
                                        </tr>
                                    ) : (
                                        transactions.map((tx) => (
                                            <tr key={tx.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{tx.id}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                    {new Date(tx.created_at).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tx.amount > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                                        }`}>
                                                        {tx.transaction_type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                    {tx.transaction_reference}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                                                    KES {tx.amount}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                    KES {tx.wallet_balance}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="bg-gray-700 px-4 py-3 flex items-center justify-between border-t border-gray-600 sm:px-6">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button onClick={handlePrev} disabled={!pagination.prev_page} className="relative inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-200 bg-gray-800 hover:bg-gray-600 disabled:opacity-50">
                                    Previous
                                </button>
                                <button onClick={handleNext} disabled={!pagination.next_page} className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-200 bg-gray-800 hover:bg-gray-600 disabled:opacity-50">
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-300">
                                        Showing page <span className="font-medium">{pagination.page}</span> of <span className="font-medium">{pagination.num_pages}</span>
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                        <button onClick={handlePrev} disabled={!pagination.prev_page} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-600 bg-gray-800 text-sm font-medium text-gray-400 hover:bg-gray-600 disabled:opacity-50">
                                            <span className="sr-only">Previous</span>
                                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        <button onClick={handleNext} disabled={!pagination.next_page} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-600 bg-gray-800 text-sm font-medium text-gray-400 hover:bg-gray-600 disabled:opacity-50">
                                            <span className="sr-only">Next</span>
                                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
