import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/auth/AuthProvider";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { UserSyncProvider } from "@/components/UserSyncProvider";
import Head from "next/head";
import StateProvider from "@/components/auth/StateProvider";

export const metadata: Metadata = {
  title: "Kwahu Dwaso - Your Trusted Marketplace",
  description: "The premier digital marketplace serving Nkawkaw and the Kwahu enclave.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <body>
        <StateProvider>
          <AuthProvider>
            <UserSyncProvider>
              <CurrencyProvider>{children}</CurrencyProvider>
            </UserSyncProvider>
          </AuthProvider>
        </StateProvider>
      </body>
    </html>
  );
}
