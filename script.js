var tarotCardSuits;

var contentBox = document.getElementById("contentBox");

window.addEventListener("load", loadTarotJson());

async function loadTarotJson() {
    // Fetch tarot card stuff if we don't have it already
    if (tarotCardSuits == null) {
        const response = await fetch('./tarotMeanings.json');
        const tarotJson = await response.json();
        tarotCardSuits = tarotJson;
    }
    
    // Do the front-end loading of the data
    loadTarot();
}

function loadTarot() {
    // Set contentBox if it is not assigned already
    if (contentBox == null) {
        contentBox = document.getElementById("contentBox");
    }

    // Attempt to load tarot card JSON data
    try{
        contentBox.innerHTML = JSON.stringify(tarotCardSuits[0].cards[0]);
    }
    catch {
        contentBox.innerHTML = "ERROR TarotCardsJSON not loaded!";
        print("ERROR TarotCardsJSON not loaded!");
    }
    
}
