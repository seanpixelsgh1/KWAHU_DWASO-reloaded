import Container from "@/components/Container";
import { ProductType } from "../../../../../type";
import AddToCartButton from "@/components/AddToCartButton";
import { getProductById, getAllProducts } from "@/lib/products";
import ProductImages from "@/components/ProductImages";
import PriceFormat from "@/components/PriceFormat";
import { FaRegEye } from "react-icons/fa";
import { paymentImage } from "@/assets";
import { MdStar } from "react-icons/md";
import ProductPrice from "@/components/ProductPrice";
import ProductFeatures from "@/components/ProductFeatures";
import ProductSpecifications from "@/components/ProductSpecifications";
import RelatedProducts from "@/components/RelatedProducts";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

const SingleProductPage = async ({ params }: Props) => {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    return notFound();
  }

  // Fetch related products for the same category
  const allProducts = await getAllProducts();

  const regularPrice = product.price || 0;
  const discount = product.discountPercentage || 0;
  const discountedPrice = regularPrice - (regularPrice * discount) / 100;
  const savings = regularPrice - discountedPrice;

  // Fake rating for UI since we removed it from schema
  const fakeRating = 4.5;
  const fakeReviewCount = 12;

  return (
    <div>
      <Container className="grid grid-cols-1 md:grid-cols-2 gap-10 py-10">
        {/* Product Image */}
        <ProductImages images={product?.images} />
        {/* Product Details */}
        <div className="flex flex-col gap-4">
          <h2 className="text-3xl font-bold">{product?.name}</h2>
          <div className="flex items-center justify-between">
            <ProductPrice
              regularPrice={regularPrice}
              discountedPrice={discountedPrice}
              product={product}
            />

            <div className="flex items-center gap-1">
              <div className="text-base text-light-text flex items-center">
                {Array?.from({ length: 5 })?.map((_, index) => {
                  const filled = index + 1 <= Math.floor(fakeRating);
                  const halfFilled =
                    index + 1 > Math.floor(fakeRating) &&
                    index < Math.ceil(fakeRating);

                  return (
                    <MdStar
                      key={index}
                      className={`${
                        filled
                          ? "text-[#fa8900]"
                          : halfFilled
                          ? "text-[#f7ca00]"
                          : "text-light-text"
                      }`}
                    />
                  );
                })}
              </div>
              <p className="text-base font-semibold">{`(${fakeRating.toFixed(
                1
              )} reviews)`}</p>
            </div>
          </div>
          <p className="flex items-center">
            <FaRegEye className="mr-1" />{" "}
            <span className="font-semibold mr-1">250+</span> people are viewing
            this right now
          </p>
          {savings > 0 && (
            <p>
              You are saving{" "}
              <span className="text-base font-semibold text-green-500">
                <PriceFormat amount={savings} />
              </span>{" "}
              upon purchase
            </p>
          )}
          <div>
            <p className="text-sm tracking-wide">{product?.description}</p>
          </div>
          {product?.brand && (
            <p>
              Brand: <span className="font-medium">{product.brand}</span>
            </p>
          )}
          <p>
            Category:{" "}
            <span className="font-medium capitalize">{product?.category}</span>
          </p>

          <AddToCartButton
            product={product}
            className=" rounded-md uppercase font-semibold mt-4"
          />

          <div className="bg-[#f7f7f7] p-5 rounded-md flex flex-col items-center justify-center gap-2 mt-4">
            <img
              src={paymentImage.src}
              alt="payment"
              className="w-auto object-cover"
            />
            <p className="font-semibold">Guaranteed safe & secure checkout</p>
          </div>
        </div>

        {/* Product Specifications */}
        <div className="col-span-2 mt-10">
          <ProductSpecifications product={product} />
        </div>
      </Container>

      {/* Product Features Section */}
      <Container>
        <ProductFeatures />
      </Container>

      {/* Related Products Section */}
      <Container>
        <RelatedProducts
          products={allProducts}
          currentProductId={product?.id}
          category={product?.category}
        />
      </Container>
    </div>
  );
};

export default SingleProductPage;
