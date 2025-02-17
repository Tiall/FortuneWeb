var tarotCardSuits;

var contentBox = document.getElementById("contentBox");

window.addEventListener("load", loadTarotJson());

async function loadTarotJson() {
    const response = await fetch('./tarotMeanings.json');
    const tarotJson = await response.json();
    tarotCardSuits = tarotJson;
    loadTarot();
}

function loadTarot() {
    try{
        contentBox.innerHTML = JSON.stringify(tarotCardSuits[0].cards[0]);
    }
    catch {
        contentBox.innerHTML = "ERROR TarotCardsJSON not loaded!";
        print("ERROR TarotCardsJSON not loaded!");
    }
    
}
