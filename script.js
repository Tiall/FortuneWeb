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
        let randCard = tarotCardSuits[Math.floor(Math.random() * (tarotCardSuits.length + 1))].cards[Math.floor(Math.random() * (tarotCardSuits.cards.length + 1))]
        contentBox.innerHTML = JSON.stringify(tarotCardSuits[0].cards[0]);
        let cardNumBox = document.getElementsByClassName("tarotCard")[0].getElementsByClassName("cardNum")[0];
        let cardDescBox = document.getElementsByClassName("tarotCard")[0].getElementsByClassName("cardDesc")[0];
        let cardNameBox = document.getElementsByClassName("tarotCard")[0].getElementsByClassName("cardName")[0];

        cardNumBox.innerHTML = randCard.number;
        cardDescBox.innerHTML = (Math.random() > 0.5) ? randCard.upright : randCard.reversed;
        cardNameBox.innerHTML = randCard.name;
        
    }
    catch {
        contentBox.innerHTML = "ERROR TarotCardsJSON not loaded!";
        print("ERROR TarotCardsJSON not loaded!");
    }
    
}
