import React from "react";
import PriceFormat from "@/components/PriceFormat";
import { FiDollarSign, FiShoppingBag, FiUsers, FiTrendingUp } from "react-icons/fi";

interface AnalyticsCardsProps {
  metrics: {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    averageOrderValue: number;
  };
}

export default function AnalyticsCards({ metrics }: AnalyticsCardsProps) {
  const cards = [
    {
      title: "Total Revenue",
      value: <PriceFormat amount={metrics.totalRevenue} />,
      icon: <FiDollarSign className="text-white" size={20} />,
      color: "bg-indigo-600",
    },
    {
      title: "Total Orders",
      value: metrics.totalOrders.toLocaleString(),
      icon: <FiShoppingBag className="text-white" size={20} />,
      color: "bg-blue-500",
    },
    {
      title: "Customers",
      value: metrics.totalCustomers.toLocaleString(),
      icon: <FiUsers className="text-white" size={20} />,
      color: "bg-green-500",
    },
    {
      title: "Avg Order Value",
      value: <PriceFormat amount={metrics.averageOrderValue} />,
      icon: <FiTrendingUp className="text-white" size={20} />,
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
          <div className={`${card.color} w-12 h-12 rounded-lg flex items-center justify-center mr-4 shadow-sm`}>
            {card.icon}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">{card.title}</p>
            <h3 className="text-2xl font-bold text-gray-900">{card.value}</h3>
          </div>
        </div>
      ))}
    </div>
  );
}
