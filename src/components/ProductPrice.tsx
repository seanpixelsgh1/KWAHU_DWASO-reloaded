"use client";
import { useEffect, useState } from "react";
import PriceFormat from "./PriceFormat";
import { useSelector } from "react-redux";
import { CartItem, ProductType, StateType } from "../../type";

const ProductPrice = ({ regularPrice, discountedPrice, product }: any) => {
  const [existingItem, setExistingItem] = useState<CartItem | null>(null);
  const { cart } = useSelector((state: StateType) => state?.kwahudwaso);
  
  useEffect(() => {
    const availableProduct = cart?.find((item) => item?.productId === product?.id);
    if (availableProduct) {
      setExistingItem(availableProduct);
    } else {
      setExistingItem(null);
    }
  }, [cart, product]);

  return (
    <div className="flex items-center gap-2">
      <PriceFormat
        className="font-semibold text-sky-color"
        amount={
          existingItem
            ? discountedPrice * existingItem.quantity
            : discountedPrice
        }
      />
      <PriceFormat
        className="text-gray-500 line-through font-normal"
        amount={
          existingItem
            ? regularPrice * existingItem.quantity
            : regularPrice
        }
      />
    </div>
  );
};

export default ProductPrice;
