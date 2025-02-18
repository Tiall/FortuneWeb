var tarotCardSuits;

var contentBox = document.getElementById("contentBox");

window.addEventListener("load", loadTarotJson());

async function loadTarotJson() {
    // Attempt to load tarot card JSON data
    try {
        // Fetch tarot card stuff if we don't have it already
        if (tarotCardSuits == null) {
            const response = await fetch('./tarotMeanings.json');
            const tarotJson = await response.json();
            tarotCardSuits = tarotJson;
        }

    }
    catch {
        contentBox.innerHTML = "ERROR TarotCardsJSON not loaded!";
        console.log("ERROR TarotCardsJSON not loaded!");
    }
    
    // Do the front-end loading of the data
    loadTarot();
}

function generateTarotCard() {
    let randSuit = Math.floor(Math.random() * (tarotCardSuits.length));
    let randCardIndex = Math.floor(Math.random() * (tarotCardSuits[randSuit].cards.length - 1));

    return tarotCardSuits[randSuit].cards[randCardIndex];
}

function loadTarot() {
    // Set contentBox if it is not assigned already
    if (contentBox == null) {
        contentBox = document.getElementById("contentBox");
    }

    let randCard = generateTarotCard()
    console.log(JSON.stringify(randCard));

    // Set textbox to raw JSON data of the randomly drawn tarot card
    contentBox.innerHTML = JSON.stringify(randCard);

    // Get the data from the randomly drawn tarot card into their respective places
    let cardNumBox = document.getElementsByClassName("tarotCard")[0].getElementsByClassName("cardNum")[0];
    let cardDescBox = document.getElementsByClassName("tarotCard")[0].getElementsByClassName("cardDesc")[0];
    let cardNameBox = document.getElementsByClassName("tarotCard")[0].getElementsByClassName("cardName")[0];

    // Set the tarot card graphic's textboxes with the data from the randomly drawn tarot card
    cardNumBox.innerHTML = randCard.number;
    cardDescBox.innerHTML = (Math.random() > 0.5) ? randCard.upright : randCard.reversed;
    cardNameBox.innerHTML = randCard.name;
    
    
    
}
