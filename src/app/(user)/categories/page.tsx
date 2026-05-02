import Container from "@/components/Container";
import InfiniteCategoryGrid from "@/components/pages/categories/InfiniteCategoryGrid";
import { getCategories, getAllProducts } from "@/lib/products";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Product Categories | Kwahu Dwaso - Shop by Category",
  description:
    "Explore our wide range of product categories including electronics, fashion, home decor, beauty, and more. Find exactly what you're looking for with our organized collections.",
  keywords: [
    "product categories",
    "electronics",
    "fashion",
    "home decor",
    "beauty products",
    "clothing",
    "accessories",
    "shop by category",
  ],
  openGraph: {
    title: "Product Categories | Kwahu Dwaso",
    description:
      "Discover our wide range of product categories. Find exactly what you're looking for with our carefully curated collections.",
    url: "/categories",
    siteName: "Kwahu Dwaso",
    type: "website",
  },
  alternates: {
    canonical: "/categories",
  },
};

export default async function CategoriesPage() {
  const [categoriesData, allProducts] = await Promise.all([
    getCategories(),
    getAllProducts(),
  ]);

  const enrichedCategories = categoriesData.map((cat) => ({
    ...cat,
    url: `/products?category=${cat.slug}`,
  }));

  return (
    <Container className="py-10">
      {/* Page Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Shop by Categories
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Discover our wide range of product categories. Find exactly what
          you&apos;re looking for with our carefully curated collections.
        </p>

        {/* Breadcrumb */}
        <nav className="mt-6 text-sm">
          <ol className="flex items-center justify-center space-x-2 text-gray-500">
            <li>
              <Link href="/" className="hover:text-gray-700 transition-colors">
                Home
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900 font-medium">Categories</li>
          </ol>
        </nav>
      </div>

      {/* Categories Grid */}
      <InfiniteCategoryGrid
        initialCategories={enrichedCategories}
        totalProducts={allProducts.length}
      />
    </Container>
  );
}
