"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LockedSavingsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [lockedSavings, setLockedSavings] = useState([]);
    const [summary, setSummary] = useState(null);
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [unlocking, setUnlocking] = useState(null);

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch locked savings
                const res = await fetch("/api/locked-savings/list");
                if (res.ok) {
                    const data = await res.json();
                    setLockedSavings(data.lockedSavings || []);
                    setSummary(data.summary);
                }

                // Fetch balance
                const balanceRes = await fetch("/api/balance");
                if (balanceRes.ok) {
                    const balanceData = await balanceRes.json();
                    setBalance(balanceData);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        }

        if (session?.user?.id) {
            fetchData();
        }
    }, [session]);

    const handleUnlock = async (id, isMature) => {
        const endpoint = isMature
            ? "/api/locked-savings/mature-unlock"
            : "/api/locked-savings/unlock";

        const confirmMessage = isMature
            ? "Unlock this matured savings? You will receive the full amount."
            : "Unlock early? You will be charged a 10% penalty.";

        if (!confirm(confirmMessage)) return;

        setUnlocking(id);
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lockedSavingId: id }),
            });

            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                // Refresh data
                window.location.reload();
            } else {
                alert(data.error || "Failed to unlock");
            }
        } catch (error) {
            console.error("Unlock error:", error);
            alert("Failed to unlock");
        } finally {
            setUnlocking(null);
        }
    };

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
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-400">Locked Savings</h1>
                    <Link
                        href="/locked-savings/create"
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                        Create New Lock
                    </Link>
                </div>

                {/* Balance Summary */}
                {balance && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-gray-900 shadow rounded-lg p-6">
                            <p className="text-sm text-gray-400 mb-2">Available Balance</p>
                            <p className="text-2xl font-bold text-green-400">
                                KES {balance.availableBalance.toFixed(2)}
                            </p>
                        </div>
                        <div className="bg-gray-900 shadow rounded-lg p-6">
                            <p className="text-sm text-gray-400 mb-2">Locked Balance</p>
                            <p className="text-2xl font-bold text-yellow-400">
                                KES {balance.lockedBalance.toFixed(2)}
                            </p>
                        </div>
                        <div className="bg-gray-900 shadow rounded-lg p-6">
                            <p className="text-sm text-gray-400 mb-2">Total Balance</p>
                            <p className="text-2xl font-bold text-blue-400">
                                KES {balance.totalBalance.toFixed(2)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Summary Stats */}
                {summary && (
                    <div className="bg-gray-900 shadow rounded-lg p-6 mb-8">
                        <h2 className="text-xl font-semibold text-gray-400 mb-4">Summary</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-400">Active Locks</p>
                                <p className="text-lg font-semibold text-gray-400">
                                    {summary.activeCount}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Total Locked</p>
                                <p className="text-lg font-semibold text-gray-400">
                                    KES {summary.totalLocked.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Locked Savings List */}
                <div className="bg-gray-900 shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-400 mb-4">
                        Your Locked Savings
                    </h2>
                    {lockedSavings.length === 0 ? (
                        <p className="text-gray-400">
                            No locked savings yet. Create one to start saving!
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {lockedSavings.map((saving) => (
                                <div
                                    key={saving.id}
                                    className="border border-gray-700 rounded-lg p-4"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="text-2xl font-bold text-gray-400">
                                                KES {saving.amount.toFixed(2)}
                                            </p>
                                            <p className="text-sm text-gray-400">
                                                Locked for {saving.lockDurationDays} days
                                            </p>
                                        </div>
                                        <span
                                            className={`px-3 py-1 rounded-full text-sm ${saving.status === "active"
                                                    ? "bg-yellow-900 text-yellow-400"
                                                    : "bg-green-900 text-green-400"
                                                }`}
                                        >
                                            {saving.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <p className="text-xs text-gray-400">Unlock Date</p>
                                            <p className="text-sm text-gray-400">
                                                {new Date(saving.unlockDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">Days Remaining</p>
                                            <p className="text-sm text-gray-400">
                                                {saving.daysRemaining} days
                                            </p>
                                        </div>
                                    </div>

                                    {saving.isMature && (
                                        <p className="text-sm text-green-400 mb-2">
                                            ✓ Matured! Unlock without penalty
                                        </p>
                                    )}

                                    {saving.canUnlock && (
                                        <button
                                            onClick={() => handleUnlock(saving.id, saving.isMature)}
                                            disabled={unlocking === saving.id}
                                            className={`w-full py-2 px-4 rounded-md text-sm font-medium ${saving.isMature
                                                    ? "bg-green-600 hover:bg-green-700 text-white"
                                                    : "bg-red-600 hover:bg-red-700 text-white"
                                                } disabled:opacity-50`}
                                        >
                                            {unlocking === saving.id
                                                ? "Unlocking..."
                                                : saving.isMature
                                                    ? "Unlock (No Penalty)"
                                                    : `Unlock Early (${saving.penaltyRate}% Penalty)`}
                                        </button>
                                    )}

                                    {saving.status === "unlocked" && (
                                        <div className="text-sm text-gray-400">
                                            <p>Unlocked on: {new Date(saving.unlockedAt).toLocaleDateString()}</p>
                                            {saving.penaltyPaid > 0 && (
                                                <p className="text-red-400">
                                                    Penalty paid: KES {saving.penaltyPaid.toFixed(2)}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
