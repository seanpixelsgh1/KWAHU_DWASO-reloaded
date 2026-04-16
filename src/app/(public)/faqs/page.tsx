import { Metadata } from "next";
import FAQClient from "./FAQClient";

export const metadata: Metadata = {
  title: "FAQs - Kwahu Dwaso",
  description: "Frequently Asked Questions - Find answers to common questions about Kwahu Dwaso",
};

export default function FAQPage() {
  return <FAQClient />;
}
