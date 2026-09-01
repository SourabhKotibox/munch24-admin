import { useState, useCallback } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import {
  useGetDashboardStats,
  useGetRevenueData,
  useGetTransactions,
  useGetAdAnalytics,
} from "@/lib/api-client";
import {
  TrendingUp, DollarSign, Coins, CreditCard, Calendar,
  RefreshCw, RotateCcw, ArrowUpRight, BarChart2, Megaphone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { useTheme } from "next-themes";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const defaultDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setFullYear(end.getFullYear() - 1);
  return {
    from: start.toISOString().split("T")[0],
    to: end.toISOString().split("T")[0],
  };
};

function ChartLoader() {
  return (
    <div className="h-64 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

export default function RevenueAnalyticsPage() {
  const { settings } = useSettings();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const def = defaultDateRange();
  const [fromInput, setFromInput] = useState(def.from);
  const [toInput, setToInput] = useState(def.to);
  const [appliedFrom, setAppliedFrom] = useState(def.from);
  const [appliedTo, setAppliedTo] = useState(def.to);
  const [revPeriod, setRevPeriod] = useState("year");

  const formatCurrency = useCallback((val: any) => {
    const num = Number(typeof val === "string" ? val.replace(/[^0-9.-]+/g, "") : val) || 0;
    const sym = settings.currencySymbol || "₹";
    const dp = settings.decimalPlaces ?? 2;
    return settings.currencyPosition === "after"
      ? `${num.toFixed(dp)} ${sym}`
      : `${sym}${num.toFixed(dp)}`;
  }, [settings]);

  const fmtStat = (v: any) => v && typeof v === "string" ? v : formatCurrency(v ?? 0);

  const dateOpts = { startDate: appliedFrom, endDate: appliedTo };
  const getChartOpts = (period: string) => period === "custom" ? { ...dateOpts, period: "custom" } : { period };

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetDashboardStats(dateOpts);
  const { data: revenueData = [], isLoading: revLoading } = useGetRevenueData(getChartOpts(revPeriod));
  const { data: transactionsData = [] } = useGetTransactions();
  const { data: adAnalyticsRaw } = useGetAdAnalytics();
  const adAnalytics = adAnalyticsRaw?.data;

  const chartColors = {
    grid: isDark ? "#27272a" : "#e4e4e7",
    axis: isDark ? "#71717a" : "#71717a",
    tooltipBg: isDark ? "#18181b" : "#ffffff",
    tooltipBorder: isDark ? "#3f3f46" : "#e4e4e7",
    tooltipLabel: isDark ? "#e4e4e7" : "#18181b",
  };

  const handleSubmit = () => {
    if (!fromInput || !toInput || new Date(fromInput) > new Date(toInput)) return;
    setAppliedFrom(fromInput);
    setAppliedTo(toInput);
    setRevPeriod("custom");
  };

  const handleReset = () => {
    const d = defaultDateRange();
    setFromInput(d.from);
    setToInput(d.to);
    setAppliedFrom(d.from);
    setAppliedTo(d.to);
    setRevPeriod("year");
  };

  const subRevNum = parseFloat(String(stats?.subscriptionRevenue || "0").replace(/[^0-9.-]+/g, "")) || 0;
  const coinRevNum = parseFloat(String(stats?.coinRevenue || "0").replace(/[^0-9.-]+/g, "")) || 0;
  const adRevNum = ((adAnalytics?.totalImpressions ?? 0) / 1000) * 15;
  const totalRevNum = subRevNum + coinRevNum + adRevNum;
  
  const coinPct = totalRevNum > 0 ? ((coinRevNum / totalRevNum) * 100).toFixed(1) : "0.0";
  const subPct = totalRevNum > 0 ? ((subRevNum / totalRevNum) * 100).toFixed(1) : "0.0";
  const adPct = totalRevNum > 0 ? ((adRevNum / totalRevNum) * 100).toFixed(1) : "0.0";

  const breakdownData = totalRevNum > 0 ? [
    { name: "Subscription", value: subRevNum, fill: "#7c3aed" },
    { name: "Coin Sales", value: coinRevNum, fill: "#2563eb" },
    { name: "Ad Revenue", value: adRevNum, fill: "#f59e0b" },
  ] : [];

  return (
    <div className="space-y-6 p-6 md:p-8 text-foreground bg-background">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            <TrendingUp className="h-6 w-6 text-primary" />
            Revenue Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track subscription revenue, coin sales, and total earnings
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-3 py-2.5">
            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="date"
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
              max={toInput}
              className={`bg-transparent text-foreground text-sm outline-none w-[130px] ${isDark ? '[color-scheme:dark]' : '[color-scheme:light]'}`}
            />
            <span className="text-muted-foreground text-sm px-1">→</span>
            <input
              type="date"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              min={fromInput}
              max={new Date().toISOString().split("T")[0]}
              className={`bg-transparent text-foreground text-sm outline-none w-[130px] ${isDark ? '[color-scheme:dark]' : '[color-scheme:light]'}`}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!fromInput || !toInput || new Date(fromInput) > new Date(toInput)}
            className="bg-primary hover:bg-primary/90 text-white h-[42px] px-5 rounded-xl font-semibold text-sm gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Apply
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            className="border-border text-foreground hover:bg-muted h-[42px] px-4 rounded-xl font-semibold text-sm gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </Button>
          <Button
            variant="ghost"
            onClick={() => refetchStats()}
            className="h-[42px] px-3 rounded-xl text-foreground"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Revenue KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Total Revenue",
            value: fmtStat(totalRevNum),
            sub: "All sources combined",
            icon: TrendingUp,
            gradient: "from-primary/10 via-card to-card",
            border: "border-primary/20",
            iconBg: "bg-primary/10 border-primary/20",
            iconColor: "text-primary",
          },
          {
            title: "Subscription Revenue",
            value: fmtStat(stats?.subscriptionRevenue),
            sub: `${subPct}% of total`,
            icon: CreditCard,
            gradient: "from-purple-500/10 via-card to-card",
            border: "border-purple-500/20",
            iconBg: "bg-purple-500/10 border-purple-500/20",
            iconColor: "text-purple-500",
          },
          {
            title: "Coin Sales Revenue",
            value: fmtStat(stats?.coinRevenue),
            sub: `${stats?.totalCoinTransactions ?? 0} purchases · ${coinPct}% of total`,
            icon: Coins,
            gradient: "from-blue-500/10 via-card to-card",
            border: "border-blue-500/20",
            iconBg: "bg-blue-500/10 border-blue-500/20",
            iconColor: "text-blue-500",
          },
          {
            title: "Estimated Ad Revenue",
            value: fmtStat(adRevNum),
            sub: `${adAnalytics?.totalImpressions?.toLocaleString() ?? 0} impressions · ${adPct}% of total`,
            icon: Megaphone,
            gradient: "from-amber-500/10 via-card to-card",
            border: "border-amber-500/20",
            iconBg: "bg-amber-500/10 border-amber-500/20",
            iconColor: "text-amber-500",
          },
        ].map((card) => (
          <Card key={card.title} className={`bg-gradient-to-br ${card.gradient} border ${card.border} shadow-sm overflow-hidden`}>
            <CardContent className="pt-5 pb-5">
              <div className={`p-2.5 rounded-xl border w-fit mb-3 ${card.iconBg}`}>
                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
              <div className={`text-2xl font-black text-foreground mb-0.5 ${statsLoading ? "animate-pulse opacity-50" : ""}`}>
                {statsLoading ? "—" : card.value}
              </div>
              <div className="text-sm font-semibold text-foreground">{card.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{card.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Split Bar */}
      {totalRevNum > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-semibold text-foreground mb-3">Revenue Breakdown</p>
          <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
            <div
              className="bg-purple-500 transition-all"
              style={{ width: `${subPct}%` }}
              title={`Subscriptions: ${subPct}%`}
            />
            <div
              className="bg-blue-500 transition-all"
              style={{ width: `${coinPct}%` }}
              title={`Coins: ${coinPct}%`}
            />
            <div
              className="bg-amber-500 transition-all"
              style={{ width: `${adPct}%` }}
              title={`Ad Revenue: ${adPct}%`}
            />
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            {[
              { color: "bg-purple-500", label: "Subscriptions", val: fmtStat(stats?.subscriptionRevenue), pct: subPct },
              { color: "bg-blue-500", label: "Coin Sales", val: fmtStat(stats?.coinRevenue), pct: coinPct },
              { color: "bg-amber-500", label: "Ad Revenue", val: fmtStat(adRevNum), pct: adPct },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-xs">
                <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                <span className="text-muted-foreground">{item.label}</span>
                <span className="text-foreground font-semibold">{item.val}</span>
                <span className="text-muted-foreground">({item.pct}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue over time */}
        <Card className="bg-card border-border shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Revenue Over Time</CardTitle>
            <Select value={revPeriod} onValueChange={setRevPeriod}>
              <SelectTrigger className="w-24 bg-background border-border text-foreground h-8 rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-foreground">
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="year">Year</SelectItem>
                {revPeriod === "custom" && <SelectItem value="custom">Custom</SelectItem>}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {revLoading ? (
              <ChartLoader />
            ) : revenueData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <DollarSign className="w-8 h-8 opacity-30" />
                <p className="text-sm">No revenue data for this period</p>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRev2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                    <XAxis dataKey="name" stroke={chartColors.axis} tick={{ fill: chartColors.axis, fontSize: 11 }} />
                    <YAxis stroke={chartColors.axis} tick={{ fill: chartColors.axis, fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: "10px" }}
                      labelStyle={{ color: chartColors.tooltipLabel }}
                      itemStyle={{ color: "#ef4444" }}
                      formatter={(v: any) => [formatCurrency(v), "Revenue"]}
                    />
                    <Area type="monotone" dataKey="value" name="Revenue" stroke="#dc2626" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev2)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Split Chart */}
        <Card className="bg-card border-border shadow-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" />
              Revenue by Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            {breakdownData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <BarChart2 className="w-8 h-8 opacity-30" />
                <p className="text-sm">No revenue data yet</p>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breakdownData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
                    <XAxis type="number" stroke={chartColors.axis} tick={{ fill: chartColors.axis, fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} />
                    <YAxis type="category" dataKey="name" stroke={chartColors.axis} tick={{ fill: chartColors.axis, fontSize: 12 }} width={100} />
                    <Tooltip
                      contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: "10px" }}
                      labelStyle={{ color: chartColors.tooltipLabel }}
                      formatter={(v: any) => [formatCurrency(v), "Revenue"]}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#dc2626">
                      {breakdownData.map((entry, i) => (
                        <rect key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="bg-card border-border shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold text-foreground">All Recent Transactions</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{transactionsData.length} entries</span>
        </CardHeader>
        <CardContent>
          {transactionsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <DollarSign className="w-8 h-8 opacity-30" />
              <p className="text-sm">No transactions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-3 px-3 text-xs font-semibold">User</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold">Type</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold">Plan / Item</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold">Method</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold">Date</th>
                    <th className="text-right py-3 px-3 text-xs font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionsData.map((t: any, i: number) => (
                    <tr key={i} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {t.avatar}
                          </div>
                          <span className="text-foreground font-medium text-sm">{t.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          t.type === "coin_purchase"
                            ? "bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20"
                            : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                        }`}>
                          {t.type === "coin_purchase" ? <Coins className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                          {t.type === "coin_purchase" ? "Coin Purchase" : "Subscription"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{t.plan}</td>
                      <td className="py-3 px-3 text-muted-foreground text-xs">{t.method || "—"}</td>
                      <td className="py-3 px-3 text-muted-foreground text-xs">{t.date}</td>
                      <td className="py-3 px-3 text-foreground font-semibold text-right flex items-center justify-end gap-1">
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                        {t.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
