document.getElementById("calculateBtn").addEventListener("click", calculate);

function calculate(){

const expense=Number(document.getElementById("expense").value);

const inflation=Number(document.getElementById("inflation").value)/100;

const years=Number(document.getElementById("years").value);

const r=Number(document.getElementById("returnRate").value)/100;

const duration=Number(document.getElementById("duration").value);

const retirementMonthly=
expense*Math.pow(1+inflation,years);

const annualExpense=retirementMonthly*12;

const corpus=
annualExpense/(r-inflation)*
(1-Math.pow((1+inflation)/(1+r),duration));

document.getElementById("result").innerHTML=
"Required Corpus<br><br><b>₹"+
(corpus/10000000).toFixed(2)+
" Crore</b>";

drawChart(retirementMonthly);

}

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
