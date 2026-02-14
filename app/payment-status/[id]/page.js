"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function PaymentStatusPage({ params }) {
    const router = useRouter();
    const { id } = params;
    const [status, setStatus] = useState("pending");
    const [error, setError] = useState("");

    useEffect(() => {
        if (!id) return;

        const checkStatus = async () => {
            try {
                const res = await fetch(`/api/transactions/${id}/status`);
                if (!res.ok) {
                    // If 404 or error, maybe retry or show error
                    // For now, retry
                    return;
                }
                const data = await res.json();

                if (data.status === "success") {
                    setStatus("success");
                    setTimeout(() => {
                        router.push("/dashboard?payment=success");
                    }, 1500); // 1.5s delay to show success message
                } else if (data.status === "failed") {
                    setStatus("failed");
                    setError("Payment failed. Please try again.");
                }
                // If pending, do nothing, will poll again
            } catch (err) {
                console.error("Status check failed", err);
            }
        };

        // Initial check
        checkStatus();

        // Poll every 3 seconds
        const interval = setInterval(checkStatus, 3000);

        return () => clearInterval(interval);
    }, [id, router]);

    return (
        <div>
            <Navbar />
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
                <div className="bg-gray-900 p-8 rounded-lg shadow-xl max-w-md w-full text-center space-y-6">

                    {status === "pending" && (
                        <>
                            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                            <h2 className="text-2xl font-bold text-white">Processing Payment...</h2>
                            <p className="text-gray-400">
                                Please check your phone and enter your PIN to complete the transaction.
                            </p>
                            <p className="text-sm text-gray-500">
                                Waiting for confirmation...
                            </p>
                        </>
                    )}

                    {status === "success" && (
                        <>
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                                <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-white">Payment Successful!</h2>
                            <p className="text-gray-400">
                                Redirecting you to dashboard...
                            </p>
                        </>
                    )}

                    {status === "failed" && (
                        <>
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                                <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-white">Payment Failed</h2>
                            <p className="text-red-400">{error}</p>
                            <button
                                onClick={() => router.push("/deposit")}
                                className="mt-4 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                            >
                                Try Again
                            </button>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
}
