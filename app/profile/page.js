"use client";

import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";

export default function ProfilePage() {
  const { data: session } = useSession();

  return (
    <div>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile</h1>
        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <p className="mt-1 text-sm text-gray-900">{session?.user?.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <p className="mt-1 text-sm text-gray-900">{session?.user?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Phone
            </label>
            <p className="mt-1 text-sm text-gray-900">{session?.user?.phone}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
