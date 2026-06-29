import React from "react";
import { motion } from "framer-motion";
import { 
  MousePointer, 
  UserPlus, 
  ShoppingBag, 
  DollarSign, 
  Users, 
  Activity 
} from "lucide-react";

const KPIStats = ({ kpis }) => {
  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const statCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(kpis.totalRevenue),
      icon: DollarSign,
      color: "from-emerald-500 to-teal-500",
      glowColor: "rgba(16, 185, 129, 0.25)",
      textColor: "text-emerald-400",
      subtitle: "Gross purchases aggregate"
    },
    {
      title: "Total Purchases",
      value: kpis.totalPurchases?.toLocaleString() || "0",
      icon: ShoppingBag,
      color: "from-indigo-500 to-purple-500",
      glowColor: "rgba(99, 102, 241, 0.25)",
      textColor: "text-indigo-400",
      subtitle: "Completed checkouts"
    },
    {
      title: "Total Signups",
      value: kpis.totalSignups?.toLocaleString() || "0",
      icon: UserPlus,
      color: "from-blue-500 to-cyan-500",
      glowColor: "rgba(59, 130, 246, 0.25)",
      textColor: "text-blue-400",
      subtitle: "Registered members"
    },
    {
      title: "Total Clicks",
      value: kpis.totalClicks?.toLocaleString() || "0",
      icon: MousePointer,
      color: "from-amber-500 to-orange-500",
      glowColor: "rgba(245, 158, 11, 0.25)",
      textColor: "text-amber-400",
      subtitle: "Mouse click triggers"
    },
    {
      title: "Active Users",
      value: kpis.activeUsers?.toLocaleString() || "0",
      icon: Users,
      color: "from-pink-500 to-rose-500",
      glowColor: "rgba(236, 72, 153, 0.25)",
      textColor: "text-pink-400",
      subtitle: "Distinct users logged"
    },
    {
      title: "Events Per Minute",
      value: kpis.eventsPerMinute?.toLocaleString() || "0",
      icon: Activity,
      color: "from-red-500 to-rose-600",
      glowColor: "rgba(239, 68, 68, 0.25)",
      textColor: "text-red-400",
      subtitle: "Current traffic velocity"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {statCards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          whileHover={{ y: -3 }}
          className="glass-panel relative overflow-hidden rounded-2xl p-6 flex flex-col justify-between group transition-all duration-300"
          style={{
            boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.2), 0 0 16px 0 ${card.glowColor}`,
          }}
        >
          {/* Top Row: Title and Colored Icon */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                {card.title}
              </p>
              <h3 className="text-2xl font-extrabold font-display text-white mt-1.5 tracking-tight group-hover:scale-[1.01] transition-transform duration-200">
                {card.value}
              </h3>
            </div>
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.color} text-white shadow-lg shadow-white/5`}>
              <card.icon size={20} />
            </div>
          </div>

          {/* Subtitle / Description */}
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-medium">
              {card.subtitle}
            </span>
            <span className={`text-[10px] font-bold ${card.textColor} flex items-center gap-1`}>
              <span className="relative flex h-1.5 w-1.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current`}></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
              </span>
              Live Feed
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default KPIStats;
