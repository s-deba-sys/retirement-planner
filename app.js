// Retirement Planner v0.1.0

document.addEventListener("DOMContentLoaded", () => {

    initializeTheme();

    initializeDashboard();

    initializeButtons();

});

function initializeDashboard(){

    document.getElementById("requiredCorpus").textContent = "₹7.40 Cr";

    document.getElementById("projectedCorpus").textContent = "₹9.30 Cr";

    document.getElementById("gap").textContent = "₹1.90 Cr Surplus";

    createChart();

}

function initializeButtons(){

    const buttons=document.querySelectorAll("nav button");

    buttons.forEach(button=>{

        button.addEventListener("click",()=>{

            buttons.forEach(b=>b.classList.remove("active"));

            button.classList.add("active");

            alert(button.innerText + " module will be implemented next.");

        });

    });

}

function initializeTheme(){

    const saved=localStorage.getItem("theme");

    if(saved==="dark"){

        document.body.classList.add("dark");

    }

}

const themeButton=document.getElementById("themeButton");

if(themeButton){

themeButton.addEventListener("click",()=>{

document.body.classList.toggle("dark");

if(document.body.classList.contains("dark"))

localStorage.setItem("theme","dark");

else

localStorage.setItem("theme","light");

});

}

function createChart(){

const ctx=document.getElementById("portfolioChart");

if(!ctx) return;

new Chart(ctx,{

type:"line",

data:{

labels:["2026","2030","2035","2040","2045","2050","2055","2060"],

datasets:[{

label:"Projected Corpus (₹ Crore)",

data:[0.07,0.25,0.75,1.8,3.2,5.1,7.1,9.3],

borderWidth:3,

fill:true,

tension:.35

}]

},

options:{

responsive:true,

plugins:{

legend:{display:true}

}

}

});

}