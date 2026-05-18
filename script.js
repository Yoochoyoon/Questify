const questFold_btn = document.getElementById("questFold-btn");
const questCoinHide = document.getElementById("questCoinHide");
const questTimer = document.getElementById("questTimer");
const computerLimit = document.getElementById("computerLimit");
const computerLimitY = document.getElementById("computerLimitY");
const computerLimitN = document.getElementById("computerLimitN");
const challengeAsk = document.getElementById("challengeAsk");
const challengeAskY = document.getElementById("challengeAskY");
const challengeAskN = document.getElementById("challengeAskN");
const challengeStopAsk = document.getElementById("challengeStopAsk");
const challengeStopAskY = document.getElementById("challengeStopAskY");
const challengeStopAskN = document.getElementById("challengeStopAskN");
const charAndBack = document.getElementById("charAndBack");
const progresBarOut = document.getElementById("progresBarOut");
const progresBarIn = document.getElementById("progresBarIn");
const minitAsk = document.getElementById("minitAsk");
const minitAnswer = document.getElementById("minitAnswer");
const minitAnswerY = document.getElementById("minitAnswerY");
const challengeFail = document.getElementById("challengeFail");
const challengeFailBtn = document.getElementById("challengeFailBtn");
const challengeS = document.getElementById("challengeS");
const challengeSBtn = document.getElementById("challengeSBtn");
const main_page = document.getElementById("main-page")
const coin = document.getElementById("coin")
const notEnoughC = document.getElementById("notEnoughC")
const notEnoughCBtn = document.getElementById("notEnoughCBtn")

let limitPc;

function timer() {

    let currentTime =
        Number(minitAnswer.value);

    let i = 0;

    progresBarIn.style.width = "0%";

    timerInterval = setInterval(() => {

        i++;

        progresBarIn.style.width =
            i + "%";

        if (i >= 100) {

            clearInterval(timerInterval);

            limitPc = false;

            coin.textContent = String(Number(coin.textContent) + 200);

            challengeS.classList.remove("hidden");
        }

    }, (currentTime * 60000) / 100);
}

questFold_btn.addEventListener("click", () => {
    questCoinHide.classList.toggle("hidden");
    if (questCoinHide.classList.contains("hidden")) {
        questFold_btn.textContent = "▼"
    }
    else {
        questFold_btn.textContent = "▲"
    }
});

questTimer.addEventListener("click", () => {
    if (questTimer.textContent === "공부 챌린지 시작!") {
        if(Number(coin.textContent)<=0){
            notEnoughC.classList.remove("hidden");
        }
        else{
        computerLimit.classList.remove("hidden");
        }
    }
    else if (
        questTimer.textContent === "챌린지 포기"
    ) {
        challengeStopAsk.classList.remove("hidden");
    }
});

computerLimitY.addEventListener("click", () => {
    computerLimit.classList.add("hidden");
    limitPc = true;
    challengeAsk.classList.remove("hidden");
});

computerLimitN.addEventListener("click", () => {
    computerLimit.classList.add("hidden");
    challengeAsk.classList.remove("hidden");
});

challengeAskY.addEventListener("click", () => { challengeAsk.classList.add("hidden"); minitAsk.classList.remove("hidden"); });

challengeAskN.addEventListener("click", () => { challengeAsk.classList.add("hidden"); });

minitAnswerY.addEventListener("click", () => { minitAsk.classList.add("hidden"); });

minitAnswerY.addEventListener("click", () => {
    const currentTime = Number(minitAnswer.value);
    minitAsk.classList.add("hidden");
    questTimer.textContent = "챌린지 포기";
    progresBarOut.classList.remove("hidden");
    timer();
    coin.textContent = String(Number(coin.textContent) - 100);
});

questTimer.addEventListener("click", () => {
    if (questTimer.textContent === "챌린지 포기")
        challengeStopAsk.classList.remove("hidden");
    challengeStopAskY.addEventListener("click", () => {
        challengeStopAsk.classList.add("hidden"); progresBarOut.classList.add("hidden");
        questTimer.textContent = "공부 챌린지 시작!";
        clearInterval(timerInterval);
        limitPc = false;
        progresBarOut.classList.add("hidden");
    });
    challengeStopAskN.addEventListener("click", () => { challengeStopAsk.classList.add("hidden"); });
});

main_page.addEventListener("mouseleave", () => {
    if (limitPc == true) {
        limitPc = false;
        clearInterval(timerInterval);
        challengeFail.classList.remove("hidden");
    }
});

challengeFailBtn.addEventListener("click", () => {
    progresBarOut.classList.add("hidden");
    challengeFail.classList.add("hidden");
    questTimer.textContent = "공부 챌린지 시작!"
    clearInterval(timerInterval);
    limitPc = false;
});

challengeSBtn.addEventListener("click", () => {
    challengeS.classList.add("hidden");
    progresBarOut.classList.add("hidden");
    questTimer.textContent = "공부 챌린지 시작!";
    clearInterval(timerInterval);
    limitPc = false;
});

notEnoughCBtn.addEventListener("click", () => {
    notEnoughC.classList.add("hidden");
});