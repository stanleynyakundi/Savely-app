"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function DepositPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState(session?.user?.phone || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: parseFloat(amount), phone }),
    });

    const data = await res.json();
    if (res.ok) {
      router.push("/dashboard?deposit=success");
    } else {
      setError(data.error || "Deposit failed");
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Deposit Money</h1>
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow rounded-lg p-6 space-y-6"
        >
          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700"
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700"
            >
              M-Pesa Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Deposit"}
          </button>
        </form>
      </div>
    </div>
  );
}
