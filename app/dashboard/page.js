"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function Dashboard() {
  const { data: session } = useSession();
  const [balance, setBalance] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch balance
        const balanceRes = await fetch("/api/balance");
        if (balanceRes.ok) {
          const balanceData = await balanceRes.json();
          // Store complete balance data
          setBalance(Number(balanceData.totalBalance) || 0);
          // Also store in stats for display
          setStats(prev => ({
            ...prev,
            availableBalance: Number(balanceData.availableBalance) || 0,
            lockedBalance: Number(balanceData.lockedBalance) || 0,
          }));
        } else {
          console.error("Balance fetch failed");
          setBalance(0); // fallback
        }

        // Fetch statistics
        const statsRes = await fetch("/api/stats");
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        } else {
          console.error("Stats fetch failed");
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

        <div className="bg-gray-900 shadow rounded-lg p-6 mb-8">
          <p className="text-sm text-gray-400">Total Balance</p>
          <p className="text-4xl font-bold text-blue-400">
            KES {balance !== null ? balance.toFixed(2) : "..."}
          </p>
          {stats && stats.lockedBalance !== undefined && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">Available</p>
                <p className="text-lg font-semibold text-green-400">
                  KES {stats.availableBalance?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Locked</p>
                <p className="text-lg font-semibold text-yellow-400">
                  KES {stats.lockedBalance?.toFixed(2) || "0.00"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-900 shadow rounded-lg p-6">
              <p className="text-sm text-gray-400 mb-2">Total Deposited</p>
              <p className="text-3xl font-bold text-green-400">
                KES {stats.deposits.total.toFixed(2)}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                {stats.deposits.count} deposit{stats.deposits.count !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="bg-gray-900 shadow rounded-lg p-6">
              <p className="text-sm text-gray-400 mb-2">Total Withdrawn</p>
              <p className="text-3xl font-bold text-red-400">
                KES {stats.withdrawals.total.toFixed(2)}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                {stats.withdrawals.count} withdrawal{stats.withdrawals.count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/deposit"
            className="block bg-gray-900 shadow rounded-lg p-6 hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold text-gray-400 mb-2">
              Deposit
            </h2>
            <p className="text-gray-400">Add money to your savings</p>
          </Link>
          <Link
            href="/withdraw"
            className="block bg-gray-900 shadow rounded-lg p-6 hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold text-gray-400 mb-2">
              Withdraw
            </h2>
            <p className="text-gray-400">Take out your savings</p>
          </Link>
          <Link
            href="/locked-savings"
            className="block bg-gray-900 shadow rounded-lg p-6 hover:shadow-md transition border-2 border-yellow-600"
          >
            <h2 className="text-xl font-semibold text-yellow-400 mb-2">
              🔒 Locked Savings
            </h2>
            <p className="text-gray-400">Lock funds for better discipline</p>
          </Link>
        </div>

        <div className="bg-gray-900 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-400 mb-4">
            Recent Transactions
          </h2>
          {recentTransactions.length === 0 ? (
            <p className="text-gray-400">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {recentTransactions.map((tx) => (
                <li key={tx.id} className="py-3 flex justify-between">
                  <span className="text-sm text-gray-400">
                    {tx.type === "deposit" ? "Deposit" : "Withdrawal"}
                  </span>
                  <span className="text-sm font-medium text-gray-400">
                    KES {Number(tx.amount).toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-400">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <Link
              href="/transactions"
              className="text-sm text-blue-400 hover:text-indigo-500"
            >
              View all →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
