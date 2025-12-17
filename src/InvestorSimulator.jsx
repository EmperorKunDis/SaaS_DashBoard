import React, { useState, useEffect } from 'react';

const InvestorSimulator = () => {
    // Výchozí hodnoty
    const [inputs, setInputs] = useState({
        arpu: 3230,
        aiCost: 50,
        marketing: 5000,
        founderCost: 20000,
        churn: 10,
        cash: 200000
    });

    const [results, setResults] = useState(null);

    const handleChange = (e) => {
        setInputs({
            ...inputs,
            [e.target.name]: parseFloat(e.target.value) || 0
        });
    };

    useEffect(() => {
        calculate();
    }, [inputs]);

    const calculate = () => {
        const newCustomers = 3;
        const currentMRR = 25837;

        const grossMargin = inputs.arpu - inputs.aiCost;
        const grossMarginPercent = grossMargin / inputs.arpu;

        const totalAcquisitionCost = inputs.marketing + inputs.founderCost;
        const cac = totalAcquisitionCost / newCustomers;

        const churnDecimal = inputs.churn / 100;
        const ltv = churnDecimal > 0 ? (inputs.arpu * grossMarginPercent) / churnDecimal : 0;

        const ratio = cac > 0 ? ltv / cac : 0;

        const burn = totalAcquisitionCost - currentMRR;
        const runway = burn > 0 ? (inputs.cash / burn) : "Profitabilní (∞)";

        setResults({ cac, ltv, ratio, runway });
    };

    const fmt = (n) => typeof n === 'number' ? Math.round(n).toLocaleString('cs-CZ') + " Kč" : n;

    return (
        // ZDE JSEM PŘIDAL FONT FAMILY, ABY TO LADILO
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm mt-8" style={{ fontFamily: '"JetBrains Mono", "Fira Code", monospace' }}>
            <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                🔮 Investor Simulator & Unit Economics
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* VSTUPY */}
                <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-4">
                        <h3 className="font-semibold text-zinc-300">Nastavení Simulace</h3>
                        <span className="text-xs text-zinc-500 uppercase tracking-widest">Editovatelné</span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wide">Cena předplatného (ARPU)</label>
                            <input type="number" name="arpu" value={inputs.arpu} onChange={handleChange}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all" />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wide">Náklad na AI (OpenAI/User)</label>
                            <input type="number" name="aiCost" value={inputs.aiCost} onChange={handleChange}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wide">Marketing (Kč)</label>
                                <input type="number" name="marketing" value={inputs.marketing} onChange={handleChange}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wide">Čas zakladatele (Kč)</label>
                                <input type="number" name="founderCost" value={inputs.founderCost} onChange={handleChange}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wide">Churn Rate (%)</label>
                                <input type="number" name="churn" value={inputs.churn} onChange={handleChange}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-red-500 focus:outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wide">Hotovost na účtu</label>
                                <input type="number" name="cash" value={inputs.cash} onChange={handleChange}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* VÝSLEDKY */}
                <div className="bg-zinc-950/50 rounded-xl p-6 border border-zinc-800/50 flex flex-col justify-center space-y-6">
                    <h3 className="font-semibold text-zinc-300 border-b border-zinc-800 pb-2">Výsledky v reálném čase</h3>

                    {results && (
                        <>
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-zinc-500 text-sm">Reálné CAC (Náklad na klienta)</div>
                                    <div className="text-sm text-zinc-600">Včetně vašeho času</div>
                                </div>
                                <div className="text-2xl font-bold text-white">{fmt(results.cac)}</div>
                            </div>

                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-zinc-500 text-sm">LTV (Hodnota klienta)</div>
                                    <div className="text-sm text-zinc-600">Při marži a churnu</div>
                                </div>
                                <div className="text-2xl font-bold text-emerald-400">{fmt(results.ltv)}</div>
                            </div>

                            <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="text-zinc-400 text-sm font-medium">LTV:CAC Ratio</div>
                                    <div className={`text-3xl font-bold ${results.ratio < 3 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {results.ratio.toFixed(1)}:1
                                    </div>
                                </div>
                                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${results.ratio < 3 ? 'bg-red-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${Math.min(results.ratio * 20, 100)}%` }}
                                    ></div>
                                </div>
                                <div className="text-xs text-zinc-500 mt-2 text-right">Cíl investorů: &gt;3:1</div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
                                <div className="text-zinc-500 text-sm">Runway (Životnost firmy)</div>
                                <div className="text-xl font-bold text-blue-400">
                                    {typeof results.runway === 'number' ? results.runway.toFixed(1) + " měsíců" : results.runway}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InvestorSimulator;