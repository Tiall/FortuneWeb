var tarotCardSuits;

var openRequest = indexedDB.open("cardStorage", 1);
var db;

openRequest.onupgradeneeded = function () {
    // triggers if the client had no database
    // ...perform initialization...
    db = openRequest.result;
    if (!db.objectStoreNames.contains('cards')) { // if there's no "cards" store
        db.createObjectStore('cards', { autoIncrement: true }); // create it
    }
};

openRequest.onerror = function () {
    console.error("Error", openRequest.error);
};

openRequest.onsuccess = function () {
    db = openRequest.result;
    // continue working with database using db object
};

function storeCardInDB(card, dbStore) {
    let request = dbStore.add(card); // (3)

    request.onsuccess = function () { // (4)
        console.log("Cards added to the store", request.result);
    };

    request.onerror = function () {
        console.log("Error", request.error);
    };
}

function generateCards(amt) {
    let transaction = db.transaction("cards", "readwrite"); // (1)

    // get an object store to operate on it
    let cards = transaction.objectStore("cards"); // (2)

    //let randCards = [];
    for (let i = 0; i < amt; i++) {
        //randCards.push(generateTarotCardNums());
        console.log(generateTarotCard());
        storeCardInDB(generateTarotCard(), cards);
    }
}

function getAllCardInDB() {
    return new Promise(function (resolve, reject) {
        let transaction = db.transaction("cards", "readonly"); // (1)

        // get an object store to operate on it
        let dbStore = transaction.objectStore("cards"); // (2)

        let request = dbStore.getAll(); // (3)

        request.onsuccess = (event) => { // (4)
            console.log("Retrieved cards from the store", event.target.result);
            resolve(event.target.result);
        };

        request.onerror = function (event) {
            console.log("Error", request.error);
            reject(event)
        };
    })
}

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

    console.log("TAROT JSON LOADED.");

    // Do the front-end loading of the data
    //renderTarotCards();
}

function getTarotCard(suit, index) {
    return tarotCardSuits[suit].cards[index];
}

function generateTarotCard() {
    let randSuit = Math.floor(Math.random() * (tarotCardSuits.length));
    let randCardIndex = Math.floor(Math.random() * (tarotCardSuits[randSuit].cards.length - 1));
    return getTarotCard(randSuit, randCardIndex);

    //return [randSuit, randCardIndex];
}

function onGenerateTarot() {
    // Set contentBox if it is not assigned already
    if (contentBox == null) {
        contentBox = document.getElementById("contentBox");
    }

    let initRandCard = generateTarotCard();
    //console.log(JSON.stringify(initRandCard));

    // Set textbox to raw JSON data of the randomly drawn tarot card
    contentBox.innerHTML = JSON.stringify(initRandCard);


    generateCards(1);


}

function drawCard(card) {
    let temp = document.getElementsByTagName("template")[0];
    let clon = temp.content.cloneNode(true);

    // Get the data from the randomly drawn tarot card into their respective places
    let cardNumBox = clon.querySelector(".cardNum");
    let cardDescBox = clon.querySelector(".cardDesc");
    let cardNameBox = clon.querySelector(".cardName");

    // Set the tarot card graphic's textboxes with the data from the randomly drawn tarot card
    cardNumBox.innerHTML = card.number;
    cardDescBox.innerHTML = (Math.random() > 0.5) ? card.upright : card.reversed;
    cardNameBox.innerHTML = card.name;

    document.body.appendChild(clon);
}

function removeRenderedCards() {
    var cards = document.querySelectorAll('.tarotCard');

    cards.forEach(card => {
        card.remove();
    });
}

async function renderTarotCards() {
    removeRenderedCards();
    let cards = await getAllCardInDB();
    console.log("Cards ",cards.length);

    if (cards == null) {
        console.log("NO TAROT CARDS STORED IN MEMORY; RENDER CANCELLED.")
        return;
    }

    console.log("RENDERING " + cards.length + " TAROT CARDS...");
    for (const key in cards) {
        drawCard(cards[key]);
        console.log("Rendered card: ", cards[key].name);
    }

    console.log("RENDERING of " + cards.length + " TAROT CARDS COMPLETED.");
}




