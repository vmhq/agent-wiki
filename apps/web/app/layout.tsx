import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { listEntries } from "@/lib/wiki";

export const metadata: Metadata = {
  title: "📚 Agent Wiki",
  description: "AI-maintained knowledge base — Karpathy LLM Wiki pattern",
  icons: {
    icon: "/favicon.svg",
  },
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const entries = listEntries();

  return (
    <html lang="en">
      <body className="min-h-screen">
        <Navbar commandPalette={<CommandPalette entries={entries} />} />
        <div className="flex">
          <AppSidebar />
          <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
