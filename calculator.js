const Finance = {

    futureExpense(monthlyExpense, inflation, years) {
        return monthlyExpense * Math.pow(1 + inflation / 100, years);
    },

    annualExpense(monthlyExpense, inflation, years) {
        return this.futureExpense(monthlyExpense, inflation, years) * 12;
    },

    retirementCorpus(monthlyExpense, inflation, yearsToRetirement, returnRate, retirementYears) {

        const annual = this.annualExpense(
            monthlyExpense,
            inflation,
            yearsToRetirement
        );

        const r = returnRate / 100;
        const g = inflation / 100;

        if (Math.abs(r - g) < 0.000001) {
            return annual * retirementYears;
        }

        return annual / (r - g) *
            (1 - Math.pow((1 + g) / (1 + r), retirementYears));
    },

    formatIndian(value) {
        return "₹ " + Math.round(value).toLocaleString("en-IN");
    }

};
