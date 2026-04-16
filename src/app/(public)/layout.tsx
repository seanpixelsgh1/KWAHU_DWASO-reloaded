import type { Metadata } from "next";
import Header from "@/components/header/Header";
import Footer from "@/components/Footer";
import Layout from "@/components/layout/Layout";

export const metadata: Metadata = {
  title: "Kwahu Dwaso - Information Pages",
  description: "Kwahu Dwaso information pages - About, Contact, Inquiry, and FAQs",
};

export default function PublicLayout({
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
