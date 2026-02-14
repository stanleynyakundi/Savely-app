"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function CreateLockedSavingPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [amount, setAmount] = useState("");
    const [duration, setDuration] = useState(30);
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const durations = [
        { days: 30, label: "30 Days (1 Month)" },
        { days: 60, label: "60 Days (2 Months)" },
        { days: 90, label: "90 Days (3 Months)" },
        { days: 180, label: "180 Days (6 Months)" },
        { days: 365, label: "365 Days (1 Year)" },
    ];

    useEffect(() => {
        async function fetchBalance() {
            try {
                const res = await fetch("/api/balance");
                if (res.ok) {
                    const data = await res.json();
                    setBalance(data);
                }
            } catch (error) {
                console.error("Error fetching balance:", error);
            }
        }

        if (session?.user?.id) {
            fetchBalance();
        }
    }, [session]);

    const calculateUnlockDate = () => {
        const date = new Date();
        date.setDate(date.getDate() + duration);
        return date.toLocaleDateString();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const numAmount = parseFloat(amount);

        if (numAmount <= 0) {
            setError("Amount must be greater than 0");
            setLoading(false);
            return;
        }

        if (balance && numAmount > balance.availableBalance) {
            setError(
                `Insufficient available balance. You have KES ${balance.availableBalance.toFixed(2)} available.`
            );
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/locked-savings/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: numAmount,
                    lockDurationDays: duration,
                }),
            });

            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                router.push("/locked-savings");
            } else {
                setError(data.error || "Failed to create locked saving");
            }
        } catch (error) {
            console.error("Create error:", error);
            setError("Failed to create locked saving");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <Navbar />
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-3xl font-bold text-gray-400 mb-8">
                    Create Locked Savings
                </h1>

                {balance && (
                    <div className="bg-gray-900 shadow rounded-lg p-6 mb-8">
                        <p className="text-sm text-gray-400 mb-2">Available to Lock</p>
                        <p className="text-3xl font-bold text-green-400">
                            KES {balance.availableBalance.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                            (KES {balance.lockedBalance.toFixed(2)} already locked)
                        </p>
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="bg-gray-900 shadow rounded-lg p-6 space-y-6"
                >
                    <div>
                        <label
                            htmlFor="amount"
                            className="block text-sm font-medium text-gray-400 mb-2"
                        >
                            Amount to Lock (KES)
                        </label>
                        <input
                            type="number"
                            id="amount"
                            min="10"
                            step="10"
                            required
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="text-gray-700 block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter amount"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="duration"
                            className="block text-sm font-medium text-gray-400 mb-2"
                        >
                            Lock Duration
                        </label>
                        <select
                            id="duration"
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value))}
                            className="text-gray-700 block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            {durations.map((d) => (
                                <option key={d.days} value={d.days}>
                                    {d.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-blue-400 mb-2">
                            Lock Details
                        </h3>
                        <div className="space-y-1 text-sm text-gray-400">
                            <p>
                                <span className="font-medium">Unlock Date:</span>{" "}
                                {calculateUnlockDate()}
                            </p>
                            <p>
                                <span className="font-medium">Early Unlock Penalty:</span> 10%
                            </p>
                            {amount && (
                                <p className="text-red-400">
                                    Early unlock would cost: KES {(parseFloat(amount) * 0.1).toFixed(2)}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4">
                        <p className="text-sm text-yellow-400">
                            ⚠️ <strong>Important:</strong> Locked funds cannot be withdrawn
                            without a 10% penalty until the unlock date. Make sure you won't
                            need this money during the lock period.
                        </p>
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex-1 py-2 px-4 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-400 hover:bg-gray-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {loading ? "Creating..." : "Lock Savings"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
