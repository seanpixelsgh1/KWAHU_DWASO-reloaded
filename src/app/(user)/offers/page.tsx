import Container from "@/components/Container";
import OffersHero from "@/components/pages/offers/OffersHero";
import { ProductType } from "../../../../type";
import OffersList from "@/components/pages/offers/OffersList";
import Link from "next/link";
import { getAllProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Special Offers - Kwahu Dwaso",
  description:
    "Discover amazing deals and special offers on our best products. Save big on electronics, fashion, beauty, and more!",
};

interface OffersPageProps {
  searchParams: Promise<{
    sort?: string;
    category?: string;
    min_discount?: string;
  }>;
}

const OffersPage = async ({ searchParams }: OffersPageProps) => {
  // Await searchParams for Next.js 15 compatibility
  const params = await searchParams;

  // Fetch all products
  const allProducts = await getAllProducts();

  // Filter products with offers (discount > 0)
  const offersProducts = allProducts.filter(
    (product) => (product.discountPercentage || 0) > 0
  );

  let products = [...offersProducts];

  // Apply additional filters
  if (params.category) {
    products = offersProducts.filter(
      (product) =>
        (product.category || "").toLowerCase() === params.category!.toLowerCase()
    );
  }

  // Filter by minimum discount percentage
  if (params.min_discount) {
    const minDiscount = parseFloat(params.min_discount);
    products = products.filter(
      (product) => (product.discountPercentage || 0) >= minDiscount
    );
  }

  // Sort products
  if (params.sort) {
    switch (params.sort) {
      case "discount-high":
        products.sort(
          (a, b) =>
            (b.discountPercentage || 0) - (a.discountPercentage || 0)
        );
        break;
      case "discount-low":
        products.sort(
          (a, b) =>
            (a.discountPercentage || 0) - (b.discountPercentage || 0)
        );
        break;
      case "price-low":
        products.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        products.sort((a, b) => b.price - a.price);
        break;
      case "name-asc":
        products.sort((a, b) =>
          (a.name || "").localeCompare(b.name || "")
        );
        break;
      case "rating":
        // Fallback for rating sort, maybe use stock or date
        products.sort(
          (a, b) => b.stock - a.stock
        );
        break;
      default:
        // Default: highest discount first
        products.sort(
          (a, b) =>
            (b.discountPercentage || 0) - (a.discountPercentage || 0)
        );
        break;
    }
  } else {
    // Default sorting by highest discount
    products.sort(
      (a, b) =>
        (b.discountPercentage || 0) - (a.discountPercentage || 0)
    );
  }

  // Get categories for filtering
  const categories = [
    ...new Set(offersProducts.map((p) => p.category).filter(Boolean)),
  ] as string[];

  // Calculate savings statistics
  const totalProducts = offersProducts.length;
  const averageDiscount =
    totalProducts > 0
      ? offersProducts.reduce(
          (sum, product) => sum + (product.discountPercentage || 0),
          0
        ) / totalProducts
      : 0;

  const maxDiscount =
    totalProducts > 0
      ? Math.max(...offersProducts.map((p) => p.discountPercentage || 0))
      : 0;

  return (
    <Container className="py-10">
      {/* Page Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          🔥 Special Offers
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
          Don&apos;t miss out on these incredible deals! Save big on your
          favorite products with discounts up to {Math.round(maxDiscount)}% off.
        </p>

        {/* Breadcrumb */}
        <nav className="text-sm">
          <ol className="flex items-center justify-center space-x-2 text-gray-500">
            <li>
              <Link href="/" className="hover:text-gray-700 transition-colors">
                Home
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900 font-medium">Special Offers</li>
          </ol>
        </nav>
      </div>

      {/* Hero Section with Stats */}
      <OffersHero
        totalOffers={totalProducts}
        averageDiscount={averageDiscount}
        maxDiscount={maxDiscount}
      />

      {/* Offers List */}
      <OffersList
        products={products}
        categories={categories}
        currentSort={params.sort || "discount-high"}
        currentCategory={params.category}
        currentMinDiscount={params.min_discount}
      />
    </Container>
  );
};

export default OffersPage;
