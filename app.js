document.getElementById("calculateBtn").addEventListener("click", calculate);

const corpus = Finance.retirementCorpus(
    expense,
    inflation,
    years,
    returnRate,
    duration
);

const future = Finance.futureExpense(
    expense,
    inflation,
    years
);

document.getElementById("result").innerHTML =
    Finance.formatIndian(corpus);

function drawChart(firstExpense){

const chart=document.getElementById("portfolioChart");

if(window.chart){

window.chart.destroy();

}

let labels=[];

let values=[];

for(let i=0;i<=45;i++){

labels.push(i);

values.push((firstExpense*Math.pow(1.06,i))/100000);

}

window.chart=new Chart(chart,{
type:"line",
data:{
labels:labels,
datasets:[{
label:"Monthly Expense (₹ Lakh)",
data:values,
fill:true,
tension:.3
}]
}
});

}

calculate();
