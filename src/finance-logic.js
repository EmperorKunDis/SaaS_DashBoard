// Soubor: src/finance-logic.js

export function setupFinanceCalculator() {
    // Definice výchozích hodnot
    const defaultFinancials = {
        currentMRR: 25837,       // [cite: 7]
        founderRate: 500         // [cite: 33]
    };

    // Hlavní výpočetní funkce
    window.calculateMetrics = function () {
        const getVal = (id) => parseFloat(document.getElementById(id).value) || 0;

        // Načtení vstupů
        const arpu = getVal('subscriptionPrice');
        const aiCost = getVal('aiApiCostPerUser');
        const mktBudget = getVal('marketingBudget');
        const founderCost = getVal('founderTimeCost');
        const churn = getVal('churnRate') / 100;
        const cash = getVal('cashOnHand');

        // Fixní počet nových zákazníků pro simulaci (dle aktuální trakce PostHub)
        const newCustomers = 3;

        // --- VÝPOČTY (Unit Economics) ---

        // 1. Gross Margin (Marže po odečtení AI nákladů)
        // Kritické pro AI SaaS, kde marže není 90% ale méně [cite: 25, 26]
        const grossMargin = arpu - aiCost;
        const grossMarginPercent = grossMargin / arpu;

        // 2. Skutečné CAC (Fully Loaded)
        // Musí zahrnovat marketing + čas zakladatele [cite: 29, 33]
        const totalAcquisitionCost = mktBudget + founderCost;
        const cac = totalAcquisitionCost / newCustomers;

        // 3. LTV (Lifetime Value)
        // LTV = (ARPU * Marže %) / Churn [cite: 25]
        const ltv = (arpu * grossMarginPercent) / churn;

        // 4. LTV:CAC Ratio
        // Cíl je > 3:1 [cite: 36]
        const ratio = cac > 0 ? ltv / cac : 0;

        // 5. Runway
        // Jak dlouho firma přežije s hotovostí [cite: 88]
        const burn = totalAcquisitionCost - defaultFinancials.currentMRR;
        const runway = burn > 0 ? (cash / burn) : "Profitabilní (∞)";

        // --- ZOBRAZENÍ VÝSLEDKŮ ---
        const resultsPanel = document.getElementById('results-panel');
        if (resultsPanel) {
            resultsPanel.style.display = 'grid';

            // Helper pro formátování měny
            const fmt = (n) => Math.round(n).toLocaleString() + " Kč";

            document.getElementById('res-cac').innerText = fmt(cac);
            document.getElementById('res-ltv').innerText = fmt(ltv);

            const ratioEl = document.getElementById('res-ratio');
            ratioEl.innerText = ratio.toFixed(1) + ":1";

            // Barvení podle zdraví metriky [cite: 36]
            ratioEl.style.color = ratio < 3 ? "#ef4444" : (ratio > 5 ? "#eab308" : "#22c55e");

            document.getElementById('res-runway').innerText =
                typeof runway === 'number' ? runway.toFixed(1) + " měsíců" : runway;
        }
    }
}