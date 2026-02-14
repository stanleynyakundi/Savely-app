"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function WithdrawPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState(session?.user?.phone || "");
  const [networkCode, setNetworkCode] = useState("63902"); // Default to M-Pesa
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState(null);
  const [fetchingBalance, setFetchingBalance] = useState(true);

  useEffect(() => {
    async function fetchBalance() {
      try {
        const res = await fetch("/api/balance");
        if (res.ok) {
          const data = await res.json();
          setBalance(Number(data.balance) || 0);
        } else {
          console.error("Failed to fetch balance");
          setBalance(0);
        }
      } catch (err) {
        console.error("Error fetching balance:", err);
        setBalance(0);
      } finally {
        setFetchingBalance(false);
      }
    }
    fetchBalance();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const withdrawAmount = parseFloat(amount);
    if (withdrawAmount > balance) {
      setError("Insufficient balance");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: withdrawAmount,
        phone,
        networkCode // Include network code in request
      }),
    });

    const data = await res.json();
    if (res.ok) {
      router.push(`/payment-status/${data.transactionId}`);
    } else {
      setError(data.error || "Withdrawal failed");
      setLoading(false);
    }
  };

  if (fetchingBalance) {
    return (
      <div>
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p>Loading balance...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-700 mb-8">
          Withdraw Money
        </h1>
        <div className="bg-gray-900 shadow rounded-lg p-6 mb-4">
          <p className="text-sm text-gray-400">Available Balance</p>
          <p className="text-2xl font-bold text-blue-400">
            KES {balance !== null ? balance.toFixed(2) : "..."}
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="bg-gray-900 shadow rounded-lg p-6 space-y-6"
        >
          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-400"
            >
              Amount (KES)
            </label>
            <input
              type="number"
              id="amount"
              min="10"
              step="10"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 text-gray-700  block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-400"
            >
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              required
              placeholder="254712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 text-gray-700  block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="network"
              className="block text-sm font-medium text-gray-400"
            >
              Mobile Money Provider
            </label>
            <select
              id="network"
              required
              value={networkCode}
              onChange={(e) => setNetworkCode(e.target.value)}
              className="mt-1 text-gray-700 block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="63902">M-Pesa</option>
              <option value="63903">Airtel Money</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Select the mobile money provider for your phone number
            </p>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-400 bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Withdraw"}
          </button>
        </form>
      </div>
    </div>
  );
}
