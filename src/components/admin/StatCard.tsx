import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: string;
    positive: boolean;
  };
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
}: StatCardProps) {
  return (
    <div className="admin-stat-card">
      <div className="flex items-center justify-between mb-3">
        <p className="admin-stat-label">{title}</p>
        {icon && <div className="admin-stat-icon">{icon}</div>}
      </div>
      <h2 className="admin-stat-value">{value}</h2>
      <div className="flex items-center gap-2 mt-1">
        {trend && (
          <span
            className={`text-xs font-medium ${
              trend.positive ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {trend.positive ? "↑" : "↓"} {trend.value}
          </span>
        )}
        {subtitle && <p className="admin-stat-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}
