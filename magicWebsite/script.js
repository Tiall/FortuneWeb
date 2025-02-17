var tarotCardSuits;

let contentBox = document.getElementById("contentBox");

window.addEventListener("load", loadTarotJson());

async function loadTarotJson() {
    const response = await fetch('./tarotMeanings.json');
    const tarotJson = await response.json();
    tarotCardSuits = tarotJson;
    loadTarot();
}

function loadTarot() {
    if (tarotCardSuits != null) {
        contentBox.innerHTML = JSON.stringify(tarotCardSuits[0].cards[0]);
    }
    else {
        print("ERROR TarotCardsJSON not loaded!");
    }
    
}