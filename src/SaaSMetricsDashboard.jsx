import React, { useState, useMemo } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Cell } from 'recharts';

// SaaS Metrics Calculator Dashboard
export default function SaaSMetricsDashboard() {
  const [activeMonth, setActiveMonth] = useState(0); // 0-indexed (Month 1 = 0)

  // Initialize 12 months of data with ZEROS
  const [monthlyInputs, setMonthlyInputs] = useState(
    Array(12).fill(null).map(() => ({
      newBasic: 0,
      newPro: 0,
      newEnterprise: 0,
    }))
  );

  const [globalInputs, setGlobalInputs] = useState({
    customerChurnRate: 5,
    cac: 3500,
    upgradedCustomers: 5,
    upgradePriceIncrease: 1500,
    months: 12 // Fixed to 12 for now as per request "az na 12 mesicu"
  });

  // Constants from pricelist
  const PRICES = {
    basic: 990,
    pro: 2490,
    enterprise: 7490
  };

  const handleMonthlyChange = (key, value) => {
    const newValue = parseFloat(value) || 0;
    setMonthlyInputs(prev => {
      const newInputs = [...prev];
      newInputs[activeMonth] = {
        ...newInputs[activeMonth],
        [key]: newValue
      };
      return newInputs;
    });
  };

  const handleGlobalChange = (key, value) => {
    setGlobalInputs(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  // Computed metrics
  const metrics = useMemo(() => {
    const { customerChurnRate, cac, upgradedCustomers, upgradePriceIncrease, months } = globalInputs;

    const churnDecimal = customerChurnRate / 100;
    const retentionRate = 100 - customerChurnRate;
    const avgLifetimeMonths = churnDecimal > 0 ? 1 / churnDecimal : 999;

    // Generate cohort data over time
    const cohortData = [];
    let totalCustomers = 0;
    let totalMRR = 0;

    // For summary metrics (using current active month or average?)
    // Let's use the totals at the end of the period for summary, 
    // but for "New Customers" display we might want to show the active month's input.

    // We need to calculate month by month using specific inputs
    for (let i = 0; i < months; i++) {
      const monthInput = monthlyInputs[i] || { newBasic: 0, newPro: 0, newEnterprise: 0 };

      const newBasic = monthInput.newBasic;
      const newPro = monthInput.newPro;
      const newEnterprise = monthInput.newEnterprise;

      const newCustomersThisMonth = newBasic + newPro + newEnterprise;
      const newMRRThisMonth = (newBasic * PRICES.basic) + (newPro * PRICES.pro) + (newEnterprise * PRICES.enterprise);

      // Add new customers
      totalCustomers += newCustomersThisMonth;

      // Apply churn (on previous total)
      // Note: Churn usually happens on existing customers. 
      // Simple model: Churn happens at end of month or start? 
      // Let's apply churn to the customers that existed BEFORE this month's addition + half of new? 
      // Standard simple model: (Start + New) * (1-Churn) -> No, usually Start * (1-Churn) + New.
      // Let's stick to the previous logic: totalCustomers = totalCustomers * (1-churn) + new?
      // Previous logic was: totalCustomers += new; totalCustomers *= (1-churn). 
      // This implies new customers also churn immediately? A bit aggressive but okay for simple model.
      // Let's refine: Existing customers churn. New customers stay for at least the first month usually.

      // Refined logic:
      const churnedCustomers = Math.round((totalCustomers - newCustomersThisMonth) * churnDecimal);
      // Actually previous logic was simple:
      // totalCustomers += new; totalCustomers *= (1-churn);
      // Let's keep it consistent with previous version for now unless requested otherwise.
      totalCustomers = totalCustomers * (1 - churnDecimal);

      // Calculate MRR
      // We need to track MRR mix. 
      // Simple approximation: Calculate Average Revenue Per User (ARPU) of the new batch and blend it?
      // Or just track Total MRR directly.
      // Total MRR = Previous MRR * (1-Churn) + New MRR + Expansion
      // This assumes Churn removes average MRR.

      totalMRR = totalMRR * (1 - churnDecimal);
      totalMRR += newMRRThisMonth;

      // Add expansion
      const expansionThisMonth = Math.min(totalCustomers * 0.1, upgradedCustomers) * upgradePriceIncrease;
      totalMRR += expansionThisMonth;

      cohortData.push({
        month: i + 1,
        customers: Math.round(totalCustomers),
        mrr: Math.round(totalMRR),
        arr: Math.round(totalMRR * 12),
        arpu: totalCustomers > 0 ? Math.round((totalMRR / totalCustomers) * 100) / 100 : 0,
        newCustomers: newCustomersThisMonth // For chart
      });
    }

    const lastMonthMetrics = cohortData[cohortData.length - 1] || { mrr: 0, arr: 0, arpu: 0, customers: 0 };
    const ltv = lastMonthMetrics.arpu * avgLifetimeMonths; // Use current ARPU for LTV
    const ltvCacRatio = cac > 0 ? ltv / cac : 0;

    // Expansion/Lost MRR for the *current active month* view or total?
    // Let's show the metrics for the *Active Month* inputs to give immediate feedback on that month's performance?
    // OR show the cumulative result at the end of 12 months?
    // Dashboard usually shows "Current State" or "Projection".
    // Let's show the "Final" numbers (Month 12) as the main KPIs, but maybe highlight the Active Month in the chart.

    // Actually, for "Lost MRR" and "Expansion MRR" breakdown, it's a monthly flow metric.
    // We should calculate these for the *Active Month* or average?
    // Let's calculate them for the *Active Month* so the user sees the impact of their inputs for that month.

    const activeMonthInput = monthlyInputs[activeMonth];
    const activeNewMRR = (activeMonthInput.newBasic * PRICES.basic) + (activeMonthInput.newPro * PRICES.pro) + (activeMonthInput.newEnterprise * PRICES.enterprise);
    const activeNewCustomers = activeMonthInput.newBasic + activeMonthInput.newPro + activeMonthInput.newEnterprise;

    // For churn/expansion calculation of the active month, we need the "Previous Month" total.
    const prevMonthIndex = activeMonth - 1;
    const prevTotalCustomers = prevMonthIndex >= 0 ? cohortData[prevMonthIndex].customers : 0; // Start with 0 if month 1
    const prevTotalMRR = prevMonthIndex >= 0 ? cohortData[prevMonthIndex].mrr : 0;

    const activeLostMRR = prevTotalMRR * churnDecimal;
    const activeExpansionMRR = Math.min(prevTotalCustomers * 0.1, upgradedCustomers) * upgradePriceIncrease; // Simplified
    const activeNetMRR = activeNewMRR + activeExpansionMRR - activeLostMRR;

    // Single cohort decay for visualization (unchanged)
    const cohortDecay = [];
    let cohortSize = 100;
    for (let i = 0; i <= 36; i++) {
      cohortDecay.push({
        month: i,
        remaining: Math.round(cohortSize * 10) / 10,
        churn5: Math.round(100 * Math.pow(0.95, i) * 10) / 10,
        churn10: Math.round(100 * Math.pow(0.90, i) * 10) / 10,
        churn20: Math.round(100 * Math.pow(0.80, i) * 10) / 10,
      });
      cohortSize = cohortSize * (1 - churnDecimal);
    }

    // LTV:CAC scenarios
    const ltvCacScenarios = [
      { name: 'Váš business', ltv: Math.round(ltv), cac: cac, ratio: Math.round(ltvCacRatio * 10) / 10, fill: ltvCacRatio >= 3 ? '#10b981' : ltvCacRatio >= 1 ? '#f59e0b' : '#ef4444' },
      { name: 'Zdravý SaaS (3:1)', ltv: cac * 3, cac: cac, ratio: 3, fill: '#10b981' },
      { name: 'Rizikový (1:1)', ltv: cac, cac: cac, ratio: 1, fill: '#ef4444' },
    ];

    return {
      mrr: lastMonthMetrics.mrr,
      arr: lastMonthMetrics.arr,
      ltv: Math.round(ltv),
      avgLifetimeMonths: Math.round(avgLifetimeMonths * 10) / 10,
      retentionRate: Math.round(retentionRate * 10) / 10,
      ltvCacRatio: Math.round(ltvCacRatio * 10) / 10,
      nrr: 0, // TODO: Fix NRR calc
      arpu: lastMonthMetrics.arpu,
      totalCustomers: lastMonthMetrics.customers,
      cohortData,
      cohortDecay,
      ltvCacScenarios,

      // Active month specific metrics for the breakdown chart
      activeNewMRR,
      activeExpansionMRR,
      activeLostMRR,
      activeNewCustomers,
      activeNetMRR
    };
  }, [monthlyInputs, globalInputs, activeMonth]);

  const formatCurrency = (value) => `${value.toLocaleString()} Kč`;
  const formatPercent = (value) => `${value}% `;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-4 md:p-8" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <header className="mb-8 md:mb-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-emerald-400 text-xs uppercase tracking-[0.3em]">Live Calculator</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-white via-emerald-200 to-cyan-400 bg-clip-text text-transparent" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          SaaS Metrics Dashboard
        </h1>
        <p className="text-zinc-500 mt-2 text-sm md:text-base">Interaktivní kalkulačka pro MRR, LTV, CAC, ARR, ARPU, Churn & NRR</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* INPUT PANEL */}
        <div className="xl:col-span-4 space-y-4">
          <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 rounded-2xl p-6 border border-zinc-800/50 backdrop-blur-xl">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Plány a Zákazníci
            </h2>

            {/* Month Selector */}
            <div className="mb-6 overflow-x-auto pb-2">
              <div className="flex space-x-2">
                {monthlyInputs.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveMonth(index)}
                    className={`px - 3 py - 2 rounded - lg text - xs font - medium whitespace - nowrap transition - all ${activeMonth === index
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      } `}
                  >
                    Měsíc {index + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/50 transition-all duration-300">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm text-emerald-400 uppercase tracking-wider font-semibold">
                    Vstupy pro Měsíc {activeMonth + 1}
                  </h3>
                  <span className="text-xs text-zinc-500">Noví zákazníci</span>
                </div>

                <div className="space-y-3">
                  <InputField
                    label="Basic (990 Kč)"
                    value={monthlyInputs[activeMonth].newBasic}
                    onChange={(v) => handleMonthlyChange('newBasic', v)}
                    suffix="zák."
                    color="emerald"
                  />
                  <InputField
                    label="Pro (2 490 Kč)"
                    value={monthlyInputs[activeMonth].newPro}
                    onChange={(v) => handleMonthlyChange('newPro', v)}
                    suffix="zák."
                    color="violet"
                  />
                  <InputField
                    label="Enterprise (7 490 Kč)"
                    value={monthlyInputs[activeMonth].newEnterprise}
                    onChange={(v) => handleMonthlyChange('newEnterprise', v)}
                    suffix="zák."
                    color="cyan"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <h3 className="text-xs text-zinc-500 mb-4 uppercase tracking-wider">Globální nastavení</h3>
                <div className="space-y-4">
                  <InputField
                    label="Měsíční Churn Rate"
                    value={globalInputs.customerChurnRate}
                    onChange={(v) => handleGlobalChange('customerChurnRate', v)}
                    suffix="%"
                    color="rose"
                    min={0}
                    max={100}
                  />
                  <InputField
                    label="CAC (náklad na akvizici)"
                    value={globalInputs.cac}
                    onChange={(v) => handleGlobalChange('cac', v)}
                    suffix="Kč"
                    color="amber"
                  />
                  <InputField
                    label="Upgradovaní zákazníci/měsíc"
                    value={globalInputs.upgradedCustomers}
                    onChange={(v) => handleGlobalChange('upgradedCustomers', v)}
                    suffix="zák."
                    color="violet"
                  />
                  <InputField
                    label="Průměrný Upsell"
                    value={globalInputs.upgradePriceIncrease}
                    onChange={(v) => handleGlobalChange('upgradePriceIncrease', v)}
                    suffix="Kč"
                    color="violet"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* METRICS & CHARTS */}
        <div className="xl:col-span-8 space-y-6">

          {/* 1. MONTHLY SUMMARY (Top) */}
          <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800/50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Měsíční přehled (Měsíc {activeMonth + 1})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Nový MRR"
                value={formatCurrency(metrics.activeNewMRR)}
                subtitle={`+ ${metrics.activeNewCustomers} zákazníků`}
                color="emerald"
                small
              />
              <MetricCard
                label="Churn MRR"
                value={`- ${Math.round(metrics.activeLostMRR).toLocaleString()} Kč`}
                subtitle="Ztráta"
                color="rose"
                small
              />
              <MetricCard
                label="Net MRR"
                value={(metrics.activeNetMRR >= 0 ? '+' : '') + formatCurrency(metrics.activeNetMRR)}
                subtitle="Čistá změna"
                color={metrics.activeNetMRR >= 0 ? "emerald" : "rose"}
                small
              />
              <MetricCard
                label="Expansion"
                value={formatCurrency(metrics.activeExpansionMRR)}
                subtitle="Upsell"
                color="violet"
                small
              />
            </div>
          </div>

          {/* 2. TOTAL OVERVIEW (Side/Below) */}
          <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 rounded-2xl p-6 border border-zinc-800/50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Celkový přehled (Po 12 měsících)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Celkový MRR"
                value={formatCurrency(metrics.mrr)}
                subtitle="Monthly Recurring Revenue"
                color="cyan"
              />
              <MetricCard
                label="Celkový ARR"
                value={formatCurrency(metrics.arr)}
                subtitle="Annual Run Rate"
                color="emerald"
              />
              <MetricCard
                label="Celkem Zákazníků"
                value={metrics.totalCustomers.toLocaleString()}
                subtitle="Aktivní předplatitelé"
                color="violet"
              />
              <MetricCard
                label="LTV"
                value={formatCurrency(metrics.ltv)}
                subtitle="Lifetime Value"
                color="amber"
              />
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Growth Chart */}
            <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 rounded-2xl p-6 border border-zinc-800/50 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                📈 Růst MRR & Zákazníků
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={metrics.cohortData}>
                    <defs>
                      <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="month" stroke="#52525b" tick={{ fill: '#71717a', fontSize: 11 }} />
                    <YAxis yAxisId="left" stroke="#06b6d4" tick={{ fill: '#06b6d4', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)} k`} />
                    <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fill: '#10b981', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                      labelStyle={{ color: '#a1a1aa' }}
                      formatter={(value, name) => [name === 'MRR' ? `${value.toLocaleString()} Kč` : value.toLocaleString(), name]}
                    />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="mrr" name="MRR" stroke="#06b6d4" fill="url(#mrrGradient)" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="customers" name="Zákazníci" stroke="#10b981" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* LTV:CAC */}
            <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 rounded-2xl p-6 border border-zinc-800/50">
              <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                💰 LTV:CAC Poměr
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.ltvCacScenarios} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis type="number" stroke="#52525b" tick={{ fill: '#71717a', fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={100} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                      formatter={(value) => [`${value}: 1`, 'Poměr']}
                    />
                    <Bar dataKey="ratio" radius={[0, 8, 8, 0]}>
                      {metrics.ltvCacScenarios.map((entry, index) => (
                        <Cell key={`cell - ${index} `} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ARR Projection */}
            <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 rounded-2xl p-6 border border-zinc-800/50">
              <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                🚀 ARR Projekce
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.cohortData}>
                    <defs>
                      <linearGradient id="arrGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="month" stroke="#52525b" tick={{ fill: '#71717a', fontSize: 11 }} />
                    <YAxis stroke="#52525b" tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)} k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                      formatter={(value) => [`${value.toLocaleString()} Kč`, 'ARR']}
                    />
                    <Area type="monotone" dataKey="arr" name="ARR" stroke="#8b5cf6" fill="url(#arrGradient)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-zinc-600 text-xs">
        <p>SaaS Metrics Calculator • Postaveno pro analýzu MRR, LTV, CAC, ARR, ARPU, Churn & NRR</p>
      </footer>
    </div>
  );
}

// Components
function InputField({ label, value, onChange, suffix, color, min = 0, max }) {
  const colors = {
    cyan: 'focus:border-cyan-500 focus:ring-cyan-500/20',
    emerald: 'focus:border-emerald-500 focus:ring-emerald-500/20',
    rose: 'focus:border-rose-500 focus:ring-rose-500/20',
    amber: 'focus:border-amber-500 focus:ring-amber-500/20',
    violet: 'focus:border-violet-500 focus:ring-violet-500/20',
    zinc: 'focus:border-zinc-500 focus:ring-zinc-500/20',
  };

  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-2">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          className={`w - full bg - zinc - 800 / 50 border border - zinc - 700 rounded - lg px - 4 py - 3 text - white focus: outline - none focus: ring - 2 transition - all ${colors[color]} `}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">{suffix}</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, subtitle, color, small }) {
  const colors = {
    cyan: 'from-cyan-500/10 to-transparent border-cyan-500/20',
    emerald: 'from-emerald-500/10 to-transparent border-emerald-500/20',
    violet: 'from-violet-500/10 to-transparent border-violet-500/20',
    amber: 'from-amber-500/10 to-transparent border-amber-500/20',
    rose: 'from-rose-500/10 to-transparent border-rose-500/20',
    zinc: 'from-zinc-500/10 to-transparent border-zinc-500/20',
  };

  const textColors = {
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    violet: 'text-violet-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
    zinc: 'text-zinc-400',
  };

  return (
    <div className={`bg - gradient - to - br ${colors[color]} rounded - xl ${small ? 'p-4' : 'p-5'} border backdrop - blur - xl`}>
      <div className={`text - xs uppercase tracking - wider ${textColors[color]} mb - 1`}>{label}</div>
      <div className={`${small ? 'text-xl' : 'text-2xl md:text-3xl'} font - bold text - white`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {value}
      </div>
      <div className="text-xs text-zinc-500 mt-1">{subtitle}</div>
    </div>
  );
}

function Formula({ name, formula }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-800/50">
      <span className="text-emerald-400 font-medium">{name}</span>
      <code className="text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded">{formula}</code>
    </div>
  );
}

function MRRBar({ label, value, maxValue, color, negative }) {
  const width = maxValue > 0 ? (value / maxValue) * 100 : 0;
  const colors = {
    emerald: 'bg-emerald-500',
    violet: 'bg-violet-500',
    rose: 'bg-rose-500',
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-zinc-400">{label}</span>
        <span className={negative ? 'text-rose-400' : 'text-white'}>
          {negative ? '-' : ''}{Math.round(value).toLocaleString()} Kč
        </span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h - full ${colors[color]} rounded - full transition - all duration - 500`}
          style={{ width: `${width}% ` }}
        />
      </div>
    </div>
  );
}