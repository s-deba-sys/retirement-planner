// =============================
// Retirement Planner Engine
// Version 0.1
// =============================

const Finance = {

    futureExpense(monthlyExpense, inflation, years){

        return monthlyExpense *
            Math.pow(1 + inflation / 100, years);

    },

    retirementCorpus(monthlyExpense,
                     inflation,
                     yearsToRetirement,
                     returnRate,
                     retirementYears){

        const futureMonthly =
            this.futureExpense(
                monthlyExpense,
                inflation,
                yearsToRetirement
            );

        const annualExpense =
            futureMonthly * 12;

        const r = returnRate / 100;
        const g = inflation / 100;

        if(Math.abs(r-g)<0.000001){

            return annualExpense * retirementYears;

        }

        return annualExpense /
               (r-g) *
               (1-Math.pow((1+g)/(1+r),
               retirementYears));

    },

    sipFutureValue(monthly,
                   annualReturn,
                   years){

        const rm = annualReturn/12/100;

        const n = years*12;

        return monthly *
            ((Math.pow(1+rm,n)-1)
            /rm)
            *(1+rm);

    },

    existingCorpus(current,
                   annualReturn,
                   years){

        return current *
            Math.pow(
                1+annualReturn/100,
                years
            );

    },

    formatIndian(value){

        return "₹ " +
            Math.round(value)
            .toLocaleString("en-IN");

    }

};
