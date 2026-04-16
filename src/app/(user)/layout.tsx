import type { Metadata } from "next";
import Header from "@/components/header/Header";
import Footer from "@/components/Footer";
import Layout from "@/components/layout/Layout";

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
    <Layout>
      <Header />
      {children}
      <Footer />
    </Layout>
  );
}
