"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";

export default function TransactionsPage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/transactions")
        .then((res) => res.json())
        .then((data) => {
          setTransactions(data.transactions);
          setLoading(false);
        });
    }
  }, [session]);

  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-white-900 mb-8">
          Transaction History
        </h1>
        <div className="bg-gray-900 shadow overflow-hidden sm:rounded-md">
          {loading ? (
            <p className="p-6 text-gray-400">Loading...</p>
          ) : transactions.length === 0 ? (
            <p className="p-6 text-gray-400">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {transactions.map((tx) => (
                <li key={tx.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-400">
                        {tx.type === "deposit" ? "Deposit" : "Withdrawal"}
                      </p>
                      <p className="text-sm text-gray-400">
                        {new Date(tx.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          tx.status === "success"
                            ? "bg-green-100 text-green-800"
                            : tx.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {tx.status}
                      </span>
                      <span className="ml-4 text-sm font-medium text-gray-400">
                        KES {tx.amount}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
