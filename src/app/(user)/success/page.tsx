"use client";

import Container from "@/components/Container";
import OrderSummarySkeleton from "@/components/OrderSummarySkeleton";
import PriceFormat from "@/components/PriceFormat";
import ProtectedRoute from "@/components/ProtectedRoute";
import { resetCart } from "@/redux/shofySlice";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import React, { useEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { FiClock, FiCheckCircle, FiAlertCircle } from "react-icons/fi";

const SuccessPage = () => {
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const router = useRouter();
  
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [attempts, setAttempts] = useState(0);
  const [isTimeout, setIsTimeout] = useState(false);
  const hasReconciled = useRef(false);

  const orderId = searchParams.get("order_id");

  useEffect(() => {
    if (!orderId) {
      router.push("/cart");
      return;
    }

    const runFallback = async () => {
      try {
        const fallbackRes = await fetch(`/api/paystack/verify?orderId=${orderId}`);
        const fallbackData = await fallbackRes.json();
        
        if (fallbackData.paymentStatus === "paid") {
          setPaymentStatus("paid");
          const finalOrderRes = await fetch(`/api/orders/${orderId}`);
          const finalOrder = await finalOrderRes.json();
          setOrderDetails({
            id: finalOrder.orderId,
            amount: finalOrder.amount,
          });
          dispatch(resetCart());
          return true;
        } else {
          return false;
        }
      } catch (error) {
        console.error("Fallback failed", error);
        return false;
      }
    };

    const fetchOrderStatus = async () => {
      try {
        setAttempts((prev) => prev + 1);
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();
        return data;
      } catch (error) {
        console.error("Error fetching order status:", error);
        return null;
      }
    };

    if (paymentStatus === "paid" || paymentStatus === "failed" || isTimeout) return;

    // Status reconciliation on page load
    if (!hasReconciled.current) {
      hasReconciled.current = true;
      fetchOrderStatus().then((data) => {
        if (data && data.paymentStatus !== "paid" && data.paymentStatus !== "failed") {
          // Immediately trigger fallback verification API
          runFallback().catch(console.error);
        }
      });
    }

    // 60-second timeout (20 attempts)
    if (attempts >= 20) {
      runFallback().then((success) => {
        if (!success) setIsTimeout(true);
      });
      return;
    }

    const interval = setInterval(async () => {
      const orderData = await fetchOrderStatus();

      if (orderData?.paymentStatus === "paid") {
        setPaymentStatus("paid");
        setOrderDetails({
          id: orderData.orderId,
          amount: orderData.amount,
        });
        dispatch(resetCart());
        clearInterval(interval);
      } else if (orderData?.paymentStatus === "failed") {
        setPaymentStatus("failed");
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [orderId, paymentStatus, isTimeout, attempts, dispatch, router]);

  // Hard guard
  if (!orderId) {
    return null; // Will redirect in useEffect
  }

  return (
    <ProtectedRoute loadingMessage="Checking your order...">
      <Container className="py-10">
        <div className="min-h-[500px] flex flex-col items-center justify-center">
          
          {/* Header Icon */}
          <div className="mb-8">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
              paymentStatus === "paid" ? 'bg-green-100' : paymentStatus === "failed" ? 'bg-red-100' : isTimeout ? 'bg-yellow-100' : 'bg-blue-100'
            }`}>
              {paymentStatus === "paid" ? (
                <FiCheckCircle className="w-10 h-10 text-green-600" />
              ) : paymentStatus === "failed" ? (
                <FiAlertCircle className="w-10 h-10 text-red-600" />
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
              {paymentStatus === "paid"
                ? "🎉 Payment Successful!" 
                : paymentStatus === "failed"
                  ? "Payment Failed"
                  : isTimeout 
                    ? "We're almost there..." 
                    : "Verifying payment..."}
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              Thank you for your purchase from{" "}
              <span className="font-semibold text-theme-color">Kwahu Dwaso</span>
            </p>
            <p className="text-gray-500">
              {paymentStatus === "paid"
                ? "Your order has been confirmed and will be shipped shortly." 
                : paymentStatus === "failed"
                  ? "Unfortunately, your payment could not be processed. Please try again."
                  : isTimeout
                    ? "Your payment is still processing safely in the background. You can safely close this page."
                    : "Please wait while we verify your transaction. Do not close this page."}
            </p>
          </div>

          {/* Details Card */}
          {paymentStatus === "pending" && !isTimeout ? (
            <OrderSummarySkeleton />
          ) : orderDetails && paymentStatus === "paid" ? (
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

