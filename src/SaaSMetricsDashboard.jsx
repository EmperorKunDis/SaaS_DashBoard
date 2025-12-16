import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Cell } from 'recharts';

// SaaS Metrics Calculator Dashboard
export default function SaaSMetricsDashboard() {
  const [activeMonth, setActiveMonth] = useState(0); // 0-indexed (Month 1 = 0)

  // Individual clients list
  // Each client: { id, name, startMonth, pausedAt (null if active), subscription: {...}, overrides: { [month]: {...} } }
  const [clients, setClients] = useState([]);
  const [nextClientId, setNextClientId] = useState(1);

  // New client form state
  const [newClientName, setNewClientName] = useState('');
  const [showAddClient, setShowAddClient] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const [globalInputs, setGlobalInputs] = useState({
    customerChurnRate: 5,
    cac: 3500,
    upgradedCustomers: 5,
    upgradePriceIncrease: 1500,
    months: 12
  });

  // Loading state for persistence
  const [isLoading, setIsLoading] = useState(true);
  const [dataPath, setDataPath] = useState('');

  // Load data on startup
  useEffect(() => {
    const loadData = async () => {
      try {
        const { ipcRenderer } = window.require?.('electron') || {};
        if (ipcRenderer) {
          const saved = await ipcRenderer.invoke('load-data');
          if (saved) {
            if (saved.clients) setClients(saved.clients);
            if (saved.nextClientId) setNextClientId(saved.nextClientId);
            if (saved.globalInputs) setGlobalInputs(prev => ({ ...prev, ...saved.globalInputs }));
          }
          const path = await ipcRenderer.invoke('get-data-path');
          setDataPath(path);
        }
      } catch (e) {
        console.error('Chyba při načítání:', e);
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Auto-save on data change (with debounce)
  useEffect(() => {
    if (isLoading) return;

    const saveData = async () => {
      try {
        const { ipcRenderer } = window.require?.('electron') || {};
        if (ipcRenderer) {
          await ipcRenderer.invoke('save-data', {
            clients,
            nextClientId,
            globalInputs
          });
        }
      } catch (e) {
        console.error('Chyba při ukládání:', e);
      }
    };

    const timeoutId = setTimeout(saveData, 500);
    return () => clearTimeout(timeoutId);
  }, [clients, nextClientId, globalInputs, isLoading]);

  // Pricing Constants
  const PLANS = {
    trial: { name: 'Trial', price: 0, color: 'zinc' },
    basic: { name: 'Basic', price: 990, color: 'emerald' },
    pro: { name: 'Pro', price: 2490, color: 'violet' },
    enterprise: { name: 'Enterprise', price: 7490, color: 'cyan' }
  };

  const FLEX_START = {
    basePrice: 490,
    persona: 199,
    premiumPost: 89,
    regeneration: 199,
    freePostsIncluded: 5,
    freeRegenerationsIncluded: 1
  };

  const ADDONS = {
    extraSupervisor: { name: 'Extra Supervisor', price: 299 },
    extraPersona: { name: 'Extra Persona', price: 199 },
    extraLanguage: { name: 'Extra Jazyk', price: 499 },
    extraVisual: { name: 'Extra Vizual', price: 99 },
    extraPlatform: { name: 'Extra Platforma', price: 199 },
    extraMarketer: { name: 'Extra Marketer', price: 599 },
    extraStorage: { name: 'Extra 1GB Storage', price: 49 },
    extraRegeneration: { name: 'Extra Regenerace', price: 199 }
  };

  // Add new client
  const addClient = () => {
    if (!newClientName.trim()) return;

    const newClient = {
      id: nextClientId,
      name: newClientName.trim(),
      startMonth: activeMonth,
      pausedAt: null, // null = active, number = paused from that month
      subscription: {
        type: 'flex',
        flexUsage: { personas: 1, premiumPosts: 0, regenerations: 0 },
        addons: {}
      },
      overrides: {} // { [month]: { subscription changes for that specific month } }
    };

    setClients(prev => [...prev, newClient]);
    setNextClientId(prev => prev + 1);
    setNewClientName('');
    setShowAddClient(false);
  };

  // Get client subscription for a specific month (with overrides)
  const getClientSubscriptionForMonth = (client, month) => {
    // Find the most recent override at or before this month
    let effectiveSub = { ...client.subscription };

    const overrideMonths = Object.keys(client.overrides)
      .map(Number)
      .filter(m => m <= month)
      .sort((a, b) => a - b);

    for (const m of overrideMonths) {
      effectiveSub = { ...effectiveSub, ...client.overrides[m] };
    }

    return effectiveSub;
  };

  // Update client subscription for current month (creates override)
  const updateClientSubscription = (clientId, subscription) => {
    setClients(prev => prev.map(client => {
      if (client.id !== clientId) return client;

      // If this is the start month, update base subscription
      if (activeMonth === client.startMonth) {
        return { ...client, subscription };
      }

      // Otherwise create an override for this month
      return {
        ...client,
        overrides: {
          ...client.overrides,
          [activeMonth]: subscription
        }
      };
    }));
  };

  // Pause client from current month
  const pauseClient = (clientId) => {
    setClients(prev => prev.map(client => {
      if (client.id !== clientId) return client;
      return { ...client, pausedAt: activeMonth };
    }));
  };

  // Unpause client (reactivate)
  const unpauseClient = (clientId) => {
    setClients(prev => prev.map(client => {
      if (client.id !== clientId) return client;
      return { ...client, pausedAt: null };
    }));
  };

  // Delete client completely
  const deleteClient = (clientId) => {
    setClients(prev => prev.filter(c => c.id !== clientId));
  };

  // Check if client is active in a given month
  const isClientActiveInMonth = (client, month) => {
    if (month < client.startMonth) return false;
    if (client.pausedAt !== null && month >= client.pausedAt) return false;
    return true;
  };

  // Get active clients for current month
  const activeClients = useMemo(() => {
    return clients.filter(c => isClientActiveInMonth(c, activeMonth));
  }, [clients, activeMonth]);

  // Get paused clients (paused at or before current month)
  const pausedClients = useMemo(() => {
    return clients.filter(c => c.pausedAt !== null && c.pausedAt <= activeMonth);
  }, [clients, activeMonth]);

  // Calculate flex revenue
  const calculateFlexRevenue = (flexUsage) => {
    const { personas, premiumPosts, regenerations } = flexUsage;
    const postsCharged = Math.max(0, premiumPosts - FLEX_START.freePostsIncluded);
    const regenCharged = Math.max(0, regenerations - FLEX_START.freeRegenerationsIncluded);

    return FLEX_START.basePrice +
      (personas * FLEX_START.persona) +
      (postsCharged * FLEX_START.premiumPost) +
      (regenCharged * FLEX_START.regeneration);
  };

  // Calculate addons revenue
  const calculateAddonsRevenue = (addons) => {
    return Object.entries(addons).reduce((sum, [key, qty]) => {
      return sum + (ADDONS[key]?.price || 0) * qty;
    }, 0);
  };

  // Calculate client monthly revenue
  const getClientMonthlyRevenue = (client, month) => {
    if (!isClientActiveInMonth(client, month)) return 0;

    const sub = getClientSubscriptionForMonth(client, month);

    if (sub.type === 'flex') {
      return calculateFlexRevenue(sub.flexUsage) + calculateAddonsRevenue(sub.addons || {});
    } else {
      return (PLANS[sub.plan]?.price || 0) + calculateAddonsRevenue(sub.addons || {});
    }
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

    const cohortData = [];
    let cumulativeCustomers = 0;
    let cumulativeMRR = 0;

    for (let month = 0; month < months; month++) {
      // Count active clients this month
      const monthClients = clients.filter(c => isClientActiveInMonth(c, month));
      const monthMRR = monthClients.reduce((sum, c) => sum + getClientMonthlyRevenue(c, month), 0);

      // New clients this month (those who started this month)
      const newClients = monthClients.filter(c => c.startMonth === month);

      // Apply churn to existing (simple model)
      cumulativeCustomers = cumulativeCustomers * (1 - churnDecimal) + newClients.length;
      cumulativeMRR = cumulativeMRR * (1 - churnDecimal) + monthMRR;

      // Expansion
      const expansion = Math.min(cumulativeCustomers * 0.1, upgradedCustomers) * upgradePriceIncrease;
      cumulativeMRR += expansion;

      cohortData.push({
        month: month + 1,
        customers: Math.max(monthClients.length, Math.round(cumulativeCustomers)),
        mrr: Math.max(monthMRR, Math.round(cumulativeMRR)),
        arr: Math.max(monthMRR * 12, Math.round(cumulativeMRR * 12)),
        arpu: monthClients.length > 0 ? Math.round(monthMRR / monthClients.length) : 0,
        newCustomers: newClients.length
      });
    }

    const lastMonth = cohortData[cohortData.length - 1] || { mrr: 0, arr: 0, arpu: 0, customers: 0 };
    const ltv = lastMonth.arpu * avgLifetimeMonths;
    const ltvCacRatio = cac > 0 ? ltv / cac : 0;

    // Active month metrics
    const activeMonthClients = clients.filter(c => isClientActiveInMonth(c, activeMonth));
    const activeNewMRR = activeMonthClients.reduce((sum, c) => sum + getClientMonthlyRevenue(c, activeMonth), 0);
    const activeNewCustomers = activeMonthClients.length;

    const prevMonthIndex = activeMonth - 1;
    const prevTotalMRR = prevMonthIndex >= 0 && cohortData[prevMonthIndex] ? cohortData[prevMonthIndex].mrr : 0;
    const prevTotalCustomers = prevMonthIndex >= 0 && cohortData[prevMonthIndex] ? cohortData[prevMonthIndex].customers : 0;

    const activeLostMRR = prevTotalMRR * churnDecimal;
    const activeExpansionMRR = Math.min(prevTotalCustomers * 0.1, upgradedCustomers) * upgradePriceIncrease;
    const activeNetMRR = activeNewMRR + activeExpansionMRR - activeLostMRR;

    // Cohort decay
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
      mrr: lastMonth.mrr,
      arr: lastMonth.arr,
      ltv: Math.round(ltv),
      avgLifetimeMonths: Math.round(avgLifetimeMonths * 10) / 10,
      retentionRate: Math.round(retentionRate * 10) / 10,
      ltvCacRatio: Math.round(ltvCacRatio * 10) / 10,
      arpu: lastMonth.arpu,
      totalCustomers: lastMonth.customers,
      cohortData,
      cohortDecay,
      ltvCacScenarios,
      activeNewMRR,
      activeExpansionMRR,
      activeLostMRR,
      activeNewCustomers,
      activeNetMRR
    };
  }, [clients, globalInputs, activeMonth]);

  const formatCurrency = (value) => `${value.toLocaleString()} Kč`;

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-white text-lg">Načítání dat...</div>
      </div>
    );
  }

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

          {/* Month Selector */}
          <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 rounded-2xl p-4 border border-zinc-800/50 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                Měsíc
              </h2>
              <span className="text-xs text-zinc-500">
                {activeMonth === 0 ? 'Flex-Start' : `Paušál`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array(12).fill(null).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveMonth(index)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    activeMonth === index
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Clients Management */}
          <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 rounded-2xl p-6 border border-zinc-800/50 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                <span className="w-2 h-2 rounded-full bg-violet-400"></span>
                Klienti (Měsíc {activeMonth + 1})
              </h2>
              <button
                onClick={() => setShowAddClient(true)}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-xs font-medium transition-all"
              >
                + Přidat
              </button>
            </div>

            {/* Add Client Form */}
            {showAddClient && (
              <div className="mb-4 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Jméno klienta</label>
                    <input
                      type="text"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Např. Firma ABC"
                      className="w-full bg-zinc-700/50 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addClient}
                      className="flex-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-xs font-medium transition-all"
                    >
                      Přidat klienta
                    </button>
                    <button
                      onClick={() => { setShowAddClient(false); setNewClientName(''); }}
                      className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs font-medium transition-all"
                    >
                      Zrušit
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Clients List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {activeClients.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 text-sm">
                  Žádní aktivní klienti.<br />
                  <span className="text-xs">Klikněte na "+ Přidat".</span>
                </div>
              ) : (
                activeClients.map(client => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    month={activeMonth}
                    subscription={getClientSubscriptionForMonth(client, activeMonth)}
                    plans={PLANS}
                    addons={ADDONS}
                    revenue={getClientMonthlyRevenue(client, activeMonth)}
                    onUpdate={(sub) => updateClientSubscription(client.id, sub)}
                    onPause={() => pauseClient(client.id)}
                    onDelete={() => deleteClient(client.id)}
                    isEditing={editingClient === client.id}
                    setEditing={(val) => setEditingClient(val ? client.id : null)}
                    hasOverride={!!client.overrides[activeMonth]}
                  />
                ))
              )}
            </div>

            {/* Paused Clients */}
            {pausedClients.length > 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <h3 className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Pozastavení klienti</h3>
                <div className="space-y-1">
                  {pausedClients.map(client => (
                    <div key={client.id} className="flex items-center justify-between p-2 bg-zinc-800/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-400">{client.name}</span>
                        <span className="text-xs text-zinc-600">od M{client.pausedAt + 1}</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => unpauseClient(client.id)}
                          className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded text-xs"
                        >
                          Obnovit
                        </button>
                        <button
                          onClick={() => deleteClient(client.id)}
                          className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded text-xs"
                        >
                          Smazat
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Global Settings */}
          <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 rounded-2xl p-6 border border-zinc-800/50 backdrop-blur-xl">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Globální nastavení
            </h2>
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

        {/* METRICS & CHARTS */}
        <div className="xl:col-span-8 space-y-6">

          {/* Monthly Summary */}
          <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800/50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Měsíční přehled (Měsíc {activeMonth + 1})
              {activeMonth === 0 && <span className="ml-2 px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded text-xs">Flex-Start</span>}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="MRR z klientů"
                value={formatCurrency(metrics.activeNewMRR)}
                subtitle={`${metrics.activeNewCustomers} klientů`}
                color="emerald"
                small
              />
              <MetricCard
                label="Churn MRR"
                value={`-${Math.round(metrics.activeLostMRR).toLocaleString()} Kč`}
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

          {/* Total Overview */}
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
                Růst MRR & Zákazníků
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
                    <YAxis yAxisId="left" stroke="#06b6d4" tick={{ fill: '#06b6d4', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
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
                LTV:CAC Poměr
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.ltvCacScenarios} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis type="number" stroke="#52525b" tick={{ fill: '#71717a', fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={100} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                      formatter={(value) => [`${value}:1`, 'Poměr']}
                    />
                    <Bar dataKey="ratio" radius={[0, 8, 8, 0]}>
                      {metrics.ltvCacScenarios.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ARR Projection */}
            <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 rounded-2xl p-6 border border-zinc-800/50">
              <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                ARR Projekce
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
                    <YAxis stroke="#52525b" tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
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
        {dataPath && <p className="text-zinc-700 mt-1">Data: {dataPath}</p>}
      </footer>
    </div>
  );
}

// Client Card Component
function ClientCard({ client, month, subscription: sub, plans, addons, revenue, onUpdate, onPause, onDelete, isEditing, setEditing, hasOverride }) {
  const updateFlexUsage = (key, value) => {
    onUpdate({
      ...sub,
      flexUsage: { ...sub.flexUsage, [key]: Math.max(0, parseInt(value) || 0) }
    });
  };

  const switchToPlan = (plan) => {
    onUpdate({
      type: 'plan',
      plan,
      addons: sub.addons || {}
    });
  };

  const switchToFlex = () => {
    onUpdate({
      type: 'flex',
      flexUsage: { personas: 1, premiumPosts: 0, regenerations: 0 },
      addons: sub.addons || {}
    });
  };

  const toggleAddon = (addonKey) => {
    const currentQty = sub.addons?.[addonKey] || 0;
    onUpdate({
      ...sub,
      addons: {
        ...sub.addons,
        [addonKey]: currentQty > 0 ? 0 : 1
      }
    });
  };

  const planColors = {
    trial: 'border-zinc-500/30 bg-zinc-500/10',
    basic: 'border-emerald-500/30 bg-emerald-500/10',
    pro: 'border-violet-500/30 bg-violet-500/10',
    enterprise: 'border-cyan-500/30 bg-cyan-500/10'
  };

  const isNewThisMonth = client.startMonth === month;

  return (
    <div className={`p-3 rounded-xl border ${sub.type === 'plan' ? planColors[sub.plan] : 'border-amber-500/30 bg-amber-500/10'} transition-all`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-white">{client.name}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${sub.type === 'flex' ? 'bg-amber-500/20 text-amber-400' : 'bg-violet-500/20 text-violet-400'}`}>
            {sub.type === 'flex' ? 'Flex' : plans[sub.plan]?.name}
          </span>
          {isNewThisMonth && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Nový</span>
          )}
          {hasOverride && !isNewThisMonth && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">Upraveno</span>
          )}
        </div>
        <span className="text-sm font-semibold text-emerald-400">{revenue.toLocaleString()} Kč</span>
      </div>

      {isEditing ? (
        <div className="space-y-3 mt-3">
          {/* Type Selector */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={switchToFlex}
              className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${sub.type === 'flex' ? 'bg-amber-500 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'}`}
            >
              Flex
            </button>
            {Object.entries(plans).map(([key, plan]) => (
              <button
                key={key}
                onClick={() => switchToPlan(key)}
                className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${sub.type === 'plan' && sub.plan === key ? 'bg-violet-500 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'}`}
              >
                {plan.name}
              </button>
            ))}
          </div>

          {/* Flex Usage */}
          {sub.type === 'flex' && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Persony</label>
                <input
                  type="number"
                  min="1"
                  value={sub.flexUsage.personas}
                  onChange={(e) => updateFlexUsage('personas', e.target.value)}
                  className="w-full bg-zinc-700/50 border border-zinc-600 rounded px-2 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Příspěvky</label>
                <input
                  type="number"
                  min="0"
                  value={sub.flexUsage.premiumPosts}
                  onChange={(e) => updateFlexUsage('premiumPosts', e.target.value)}
                  className="w-full bg-zinc-700/50 border border-zinc-600 rounded px-2 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Regenerace</label>
                <input
                  type="number"
                  min="0"
                  value={sub.flexUsage.regenerations}
                  onChange={(e) => updateFlexUsage('regenerations', e.target.value)}
                  className="w-full bg-zinc-700/50 border border-zinc-600 rounded px-2 py-1 text-xs text-white"
                />
              </div>
            </div>
          )}

          {/* Add-ons */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Add-ony</label>
            <div className="flex flex-wrap gap-1">
              {Object.entries(addons).map(([key, addon]) => (
                <button
                  key={key}
                  onClick={() => toggleAddon(key)}
                  className={`px-2 py-1 rounded text-xs transition-all ${sub.addons?.[key] ? 'bg-violet-500 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'}`}
                >
                  {addon.name} (+{addon.price})
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-zinc-700">
            <button
              onClick={() => setEditing(false)}
              className="flex-1 px-2 py-1.5 bg-emerald-500 hover:bg-emerald-600 rounded text-xs font-medium"
            >
              Hotovo
            </button>
            <button
              onClick={onPause}
              className="px-2 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded text-xs font-medium"
              title="Pozastavit od tohoto měsíce"
            >
              Pauza
            </button>
            <button
              onClick={onDelete}
              className="px-2 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded text-xs font-medium"
            >
              Smazat
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mt-1">
          <div className="text-xs text-zinc-500">
            {sub.type === 'flex'
              ? `${sub.flexUsage.personas} pers., ${sub.flexUsage.premiumPosts} přísp., ${sub.flexUsage.regenerations} regen.`
              : `${plans[sub.plan]?.price.toLocaleString()} Kč/měs.`
            }
            {Object.values(sub.addons || {}).some(v => v > 0) && ' + add-ony'}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs text-zinc-300"
          >
            Upravit
          </button>
        </div>
      )}
    </div>
  );
}

// Input Field Component
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
          className={`w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 transition-all ${colors[color]}`}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">{suffix}</span>
      </div>
    </div>
  );
}

// Metric Card Component
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
    <div className={`bg-gradient-to-br ${colors[color]} rounded-xl ${small ? 'p-4' : 'p-5'} border backdrop-blur-xl`}>
      <div className={`text-xs uppercase tracking-wider ${textColors[color]} mb-1`}>{label}</div>
      <div className={`${small ? 'text-xl' : 'text-2xl md:text-3xl'} font-bold text-white`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {value}
      </div>
      <div className="text-xs text-zinc-500 mt-1">{subtitle}</div>
    </div>
  );
}
