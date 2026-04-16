"use client";

import Container from "@/components/Container";
import OrderSummarySkeleton from "@/components/OrderSummarySkeleton";
import PriceFormat from "@/components/PriceFormat";
import ProtectedRoute from "@/components/ProtectedRoute";
import { resetCart } from "@/redux/shofySlice";
import Link from "next/link";
import { redirect, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { useSession } from "next-auth/react";
import { FiClock, FiCheckCircle, FiAlertCircle } from "react-icons/fi";

const SuccessPage = () => {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const reference = searchParams.get("reference");
  const dispatch = useDispatch();
  const { data: session } = useSession();
  const [orderProcessed, setOrderProcessed] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [attempts, setAttempts] = useState(0);
  const [isTimeout, setIsTimeout] = useState(false);

  !orderId && redirect("/");

  useEffect(() => {
    if (!orderId || !reference || !session?.user?.email || orderProcessed || isTimeout) return;

    const confirmOrderPayment = async () => {
      try {
        setAttempts((prev) => prev + 1);
        const response = await fetch('/api/orders/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId,
            reference
          })
        });

        if (!response.ok) return;

        const data = await response.json();
        
        if (data.success && data.order) {
          toast.success("Payment confirmed successfully!");
          setOrderProcessed(true);
          setOrderDetails(data.order);
          dispatch(resetCart());
        }
      } catch (error) {
        console.error("Error confirming order status:", error);
      }
    };

    const pollInterval = setInterval(() => {
      confirmOrderPayment();
    }, 4000); // 4 seconds

    // 60-second timeout (15 attempts)
    if (attempts >= 15) {
      clearInterval(pollInterval);
      setIsTimeout(true);
    }

    return () => clearInterval(pollInterval);
  }, [orderId, reference, session?.user?.email, orderProcessed, isTimeout, attempts, dispatch]);

  return (
    <ProtectedRoute loadingMessage="Checking your order...">
      <Container className="py-10">
        <div className="min-h-[500px] flex flex-col items-center justify-center">
          
          {/* Header Icon */}
          <div className="mb-8">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
              orderProcessed ? 'bg-green-100' : isTimeout ? 'bg-yellow-100' : 'bg-blue-100'
            }`}>
              {orderProcessed ? (
                <FiCheckCircle className="w-10 h-10 text-green-600" />
              ) : isTimeout ? (
                <FiAlertCircle className="w-10 h-10 text-yellow-600" />
              ) : (
                <FiClock className="w-10 h-10 text-blue-600 animate-pulse" />
              )}
            </div>
          </div>

          {/* Message */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {orderProcessed 
                ? "🎉 Payment Successful!" 
                : isTimeout 
                  ? "We're almost there..." 
                  : "Payment received. Waiting for confirmation..."}
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              Thank you for your purchase from{" "}
              <span className="font-semibold text-theme-color">Kwahu Dwaso</span>
            </p>
            <p className="text-gray-500">
              {orderProcessed 
                ? "Your order has been confirmed and will be shipped shortly." 
                : isTimeout
                  ? "Your payment is still processing safely in the background. You can safely close this page."
                  : "Please wait while we verify your transaction with Paystack. Do not close this page."}
            </p>
          </div>

          {/* Details Card */}
          {!orderProcessed ? (
            <OrderSummarySkeleton />
          ) : orderDetails ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 max-w-md w-full shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">
                Order Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-medium">#{orderDetails.id || orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">
                    <PriceFormat amount={orderDetails.amount} />
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    Confirmed
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
            <Link href="/account/orders">
              <button className="bg-theme-color text-white px-8 py-3 rounded-md font-medium hover:bg-theme-color/90 transition-colors w-52">
                View My Orders
              </button>
            </Link>
            <Link href="/">
              <button className="border border-gray-300 text-gray-700 px-8 py-3 rounded-md font-medium hover:bg-gray-50 transition-colors w-52">
                Continue Shopping
              </button>
            </Link>
          </div>

        </div>
      </Container>
    </ProtectedRoute>
  );
};

export default SuccessPage;
