"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function Dashboard() {
  const { data: session } = useSession();
  const [balance, setBalance] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch balance
        const balanceRes = await fetch("/api/balance");
        if (balanceRes.ok) {
          const balanceData = await balanceRes.json();
          // Convert to number to be safe
          setBalance(Number(balanceData.balance) || 0);
        } else {
          console.error("Balance fetch failed");
          setBalance(0); // fallback
        }

        // Fetch recent transactions
        const txRes = await fetch("/api/transactions?limit=5");
        if (txRes.ok) {
          const txData = await txRes.json();
          setRecentTransactions(txData.transactions || []);
        } else {
          console.error("Transactions fetch failed");
          setRecentTransactions([]);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    if (session?.user?.id) {
      fetchData();
    }
  }, [session]);

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-white-900 mb-8">Dashboard</h1>

        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <p className="text-sm text-gray-500">Current Balance</p>
          <p className="text-4xl font-bold text-indigo-600">
            KES {balance !== null ? balance.toFixed(2) : "..."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            href="/deposit"
            className="block bg-white shadow rounded-lg p-6 hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Deposit
            </h2>
            <p className="text-gray-500">Add money to your savings</p>
          </Link>
          <Link
            href="/withdraw"
            className="block bg-white shadow rounded-lg p-6 hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Withdraw
            </h2>
            <p className="text-gray-500">Take out your savings</p>
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Recent Transactions
          </h2>
          {recentTransactions.length === 0 ? (
            <p className="text-gray-500">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {recentTransactions.map((tx) => (
                <li key={tx.id} className="py-3 flex justify-between">
                  <span className="text-sm text-gray-900">
                    {tx.type === "deposit" ? "Deposit" : "Withdrawal"}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    KES {Number(tx.amount).toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <Link
              href="/transactions"
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              View all →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
