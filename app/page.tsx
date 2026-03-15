"use client";

import {
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { api } from "../convex/_generated/api";
import Link from "next/link";
import { SignUpButton } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import Header from "@/components/Home/Header";

export default function Home() {
  return (
    <>
      <Header />
      <main className="p-8 flex flex-col gap-8">
        <Authenticated>
          <p className="text-center text-lg">
            You are authenticated! Explore the{" "}
            <Link href="/dashboard" className="text-blue-500 hover:underline">
              dashboard
            </Link>{" "}
            to see Convex in action.
          </p>
        </Authenticated>
        <Unauthenticated>
          <div className="flex flex-col items-center gap-4">Login First </div>
        </Unauthenticated>
      </main>
    </>
  );
}
