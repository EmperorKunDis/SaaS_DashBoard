import React, { useState } from 'react';

const InvestorSimulator = () => {
    // Stavové proměnné pro vstupy
    const [inputs, setInputs] = useState({
        arpu: 3230,
        aiCost: 50,
        marketing: 5000,
        founderCost: 20000,
        churn: 10,
        cash: 0
    });

    // Stav pro výsledky
    const [results, setResults] = useState(null);

    // Funkce pro aktualizaci vstupů
    const handleChange = (e) => {
        setInputs({
            ...inputs,
            [e.target.name]: parseFloat(e.target.value) || 0
        });
    };

    // Hlavní výpočetní logika
    const calculate = () => {
        const newCustomers = 3; // Fixní odhad dle současné trakce
        const currentMRR = 25837;

        // 1. Gross Margin
        const grossMargin = inputs.arpu - inputs.aiCost;
        const grossMarginPercent = grossMargin / inputs.arpu;

        // 2. CAC (Fully Loaded)
        const totalAcquisitionCost = inputs.marketing + inputs.founderCost;
        const cac = totalAcquisitionCost / newCustomers;

        // 3. LTV
        const churnDecimal = inputs.churn / 100;
        const ltv = churnDecimal > 0 ? (inputs.arpu * grossMarginPercent) / churnDecimal : 0;

        // 4. Ratio
        const ratio = cac > 0 ? ltv / cac : 0;

        // 5. Runway
        const burn = totalAcquisitionCost - currentMRR;
        const runway = burn > 0 ? (inputs.cash / burn) : "Profitabilní (∞)";

        setResults({ cac, ltv, ratio, runway });
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mt-6 border border-gray-200">
            <h2 className="text-xl font-bold mb-4 text-gray-800">📊 Investor Simulator & Unit Economics</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Vstupy */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-600 border-b pb-2">Parametry</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Cena předplatného (ARPU) v Kč</label>
                        <input type="number" name="arpu" value={inputs.arpu} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Náklad na AI API / user (Kč)</label>
                        <input type="number" name="aiCost" value={inputs.aiCost} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Marketing Budget (Kč)</label>
                        <input type="number" name="marketing" value={inputs.marketing} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Čas zakladatele (Kč)</label>
                        <input type="number" name="founderCost" value={inputs.founderCost} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                        <p className="text-xs text-gray-500 mt-1">*Nutné pro reálné CAC</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Churn (%)</label>
                            <input type="number" name="churn" value={inputs.churn} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Hotovost (Kč)</label>
                            <input type="number" name="cash" value={inputs.cash} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                        </div>
                    </div>

                    <button onClick={calculate} className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition duration-200">
                        Přepočítat Projekci
                    </button>
                </div>

                {/* Výsledky */}
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-600 border-b pb-2 mb-4">Výsledky</h3>
                    {!results ? (
                        <div className="text-gray-400 text-center mt-10">Zadejte data a klikněte na přepočítat</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            <div className="bg-white p-3 rounded shadow-sm">
                                <div className="text-sm text-gray-500">Reálné CAC</div>
                                <div className="text-2xl font-bold text-gray-800">{Math.round(results.cac).toLocaleString()} Kč</div>
                            </div>
                            <div className="bg-white p-3 rounded shadow-sm">
                                <div className="text-sm text-gray-500">LTV (Hodnota zákazníka)</div>
                                <div className="text-2xl font-bold text-gray-800">{Math.round(results.ltv).toLocaleString()} Kč</div>
                            </div>
                            <div className="bg-white p-3 rounded shadow-sm">
                                <div className="text-sm text-gray-500">LTV:CAC Ratio</div>
                                <div className={`text-2xl font-bold ${results.ratio < 3 ? 'text-red-500' : (results.ratio > 5 ? 'text-yellow-500' : 'text-green-500')}`}>
                                    {results.ratio.toFixed(1)}:1
                                </div>
                                <div className="text-xs text-gray-400">Cíl: 3:1 až 5:1</div>
                            </div>
                            <div className="bg-white p-3 rounded shadow-sm">
                                <div className="text-sm text-gray-500">Runway</div>
                                <div className="text-2xl font-bold text-blue-600">
                                    {typeof results.runway === 'number' ? results.runway.toFixed(1) + " měsíců" : results.runway}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InvestorSimulator;