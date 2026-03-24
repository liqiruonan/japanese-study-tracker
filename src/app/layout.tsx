import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { logout } from "./auth/actions";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nihongo Tracker",
  description: "Track your Japanese study progress",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en">
      <body className={inter.className}>
        {user && (
          <nav className="border-b p-4 mb-4 flex justify-between items-center bg-muted/20">
            <div className="space-x-6 flex items-center">
              <Link href="/" className="font-bold">Dashboard</Link>
              <Link href="/decks" className="hover:underline">Decks</Link>
              <Link href="/mistakes" className="hover:underline text-red-500/80 font-medium">Mistakes</Link>
              <Link href="/friends" className="hover:underline">Friends</Link>
            </div>
            <form action={logout}>
              <Button variant="ghost" size="sm">Sign Out</Button>
            </form>
          </nav>
        )}
        {children}
      </body>
    </html>
  );
}
