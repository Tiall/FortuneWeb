// The promise loaded from the TarotMeanings JSON
var tarotCardSuits;

// Opening a database call request
var openRequest = indexedDB.open("cardStorage", 1);

// The db we get from the call request
var db;

history.scrollRestoration = "manual";

// On invalid database load
openRequest.onupgradeneeded = function () {
    // triggers if the client had no database
    // ...perform initialization...
    db = openRequest.result;
    if (!db.objectStoreNames.contains('cards')) { // if there's no "cards" store
        db.createObjectStore('cards', { autoIncrement: true }); // create it
    }
};

// On database failed connection
openRequest.onerror = function () {
    console.error("Error", openRequest.error);
};

// On database successful connection
openRequest.onsuccess = function () {
    db = openRequest.result;
    repairOldCards();

    // Render our cards on the screen
    renderTarotCards();
};

// Adds the provided card to the provided database store
function storeCardInDB(card, dbStore) {
    let request = dbStore.add(card); // (3)

    request.onsuccess = function () { // (4)
        console.log("Cards added to the store", request.result);
    };

    request.onerror = function () {
        console.log("Error", request.error);
    };
}

// Fixes all the database cards where the card's version "etag" is too old, replacing it with new card data
function repairOldCards() {
    let transaction = db.transaction("cards", "readwrite"); // (1)

    // get an object store to operate on it
    let dbStore = transaction.objectStore("cards"); // (2)

    let cursorRequest = dbStore.openCursor();

    let replacedCount = 0;
    cursorRequest.onsuccess = function (event) {
        let cursor = event.target.result;
        
        if (cursor) {
            if (!('eTag' in cursor.value) || cursor.value.eTag != dbETagKey) {
                // Replace the out of data card with a new random card. THIS COULD CHANGE THIS IN THE FUTURE POTENTIALLY
                const updateRequest = cursor.update(generateCard());
                replacedCount++;

                updateRequest.onsuccess = function () {
                    console.log('Record replaced successfully.');
                };

                updateRequest.onerror = function () {
                    console.error('Error replacing record.');
                };
            }

            // Move to the next record
            cursor.continue();
            
        }
        else {
            console.log("Replaced card count: ", replacedCount);
        }
    };

    cursorRequest.onerror = function (event) {
        console.log("Error", request.error);
    };
}

// Removes a card from the board and your hand in the database
function discardCard(event, element) {
    event.preventDefault();
    if (document.querySelectorAll('.tarotCard').length > 0) {
        saveCardPositions();

    }

    let clickedCardID = element.getAttribute("card-id");
    console.log("ID:", clickedCardID);

    let transaction = db.transaction("cards", "readwrite"); // (1)

    // get an object store to operate on it
    let cards = transaction.objectStore("cards"); // (2)

    let cursorRequest = cards.openCursor(); // (3)

    cursorRequest.onsuccess = async function (event) {
        let cursor = event.target.result;

        if (cursor) {
            if (cursor.key == clickedCardID) {
                console.log("Retrieved cards from the store", cursor.value);

                const updateRequest = cursor.delete();

                updateRequest.onsuccess = () => {
                    console.log("Card deleted ", updateRequest.result);
                }
                updateRequest.onerror = function () {
                    console.log("Error", updateRequest.error);
                };
            }

            // Move to the next record
            cursor.continue();
        }
        else {
            // Rerender cards if we flip one
            renderTarotCards();
        }

        document.getElementById("cardCountBox").innerHTML = await countDBCards();
    };

    cursorRequest.onerror = function (event) {
        console.log("Error", cursorRequest.error);
    };
}

// Counts how many cards are in your hand in the database
function countDBCards() {
    return new Promise(function (resolve, reject) {
        let transaction = db.transaction("cards", "readwrite"); // (1)

        // get an object store to operate on it
        let cards = transaction.objectStore("cards"); // (2)

        const countRequest = cards.count();

        countRequest.onsuccess = () => {
            resolve(countRequest.result);
        }
        countRequest.onerror = (event) => {
            console.log("Error", cursorRequest.error);
            reject(event);
        }
    })
}

// Replaces all cards in the database with a new card, but at their current positions so your placed down layouts will stay the same
function replaceCards() {
    if (document.querySelectorAll('.tarotCard').length > 0) {
        saveCardPositions();

    }

    let transaction = db.transaction("cards", "readwrite"); // (1)

    // get an object store to operate on it
    let dbStore = transaction.objectStore("cards"); // (2)

    let cursorRequest = dbStore.openCursor();

    cursorRequest.onsuccess = function (event) {
        let cursor = event.target.result;

        if (cursor) {
            let newCard = generateCard();
            newCard.xPosition = cursor.value.xPosition
            newCard.yPosition = cursor.value.yPosition
            const updateRequest = cursor.update(newCard);

            updateRequest.onsuccess = function () {
                console.log('Record replaced successfully.');
            };

            updateRequest.onerror = function () {
                console.error('Error replacing record.');
            };

            // Move to the next record
            cursor.continue();

        }
        else {
            // Rerender cards if we replace 'em
            renderTarotCards();
        }
    };

    cursorRequest.onerror = function (event) {
        console.log("Error", request.error);
        
    };
}


const dbETagKey = 1; // This key is compared to the version number of the card on load so that we can replace/remove old cards

// Generates multiple card objects and stores them in your hand in the database
function generateCards(amt) {
    let transaction = db.transaction("cards", "readwrite"); // (1)

    // get an object store to operate on it
    let cards = transaction.objectStore("cards"); // (2)

    //let randCards = [];
    for (let i = 0; i < amt; i++) {
        let fullCardObj = generateCard();
        console.log(fullCardObj);

        storeCardInDB(fullCardObj, cards);
    }
}
// Generates a new card object
function generateCard() {
    let generatedCard = generateCardData();
    let fullCardObj = {
        number: generatedCard.number,
        name: generatedCard.name,

        // isReversed can be used to determine if we should flip the image on the card and it is used for the proceeding meaning
        isReversed: Math.random() > 0.5,
        meaning: (this.isReversed ? generatedCard.upright : generatedCard.reversed),

        // Has the card been flipped over yet?
        isFlipped: false,

        // Position of card on screen
        xPosition: -1,
        yPosition: -1,

        eTag: dbETagKey
    }
    return fullCardObj;
}

// Gets all the cards in your hand from the database
function getAllCardsInDB() {
    return new Promise(function (resolve, reject) {
        let transaction = db.transaction("cards", "readonly"); // (get db transaction)

        // get an object store to operate on it
        let dbStore = transaction.objectStore("cards"); // (gets the db objectstore of cards)

        let cursorRequest = dbStore.openCursor(); // (opens a cursor for out objectstore)

        var result = {};
        cursorRequest.onsuccess = function (event) {
            let cursor = event.target.result;
            
            if (cursor) {
                // Save object key and value in dictionary
                result[cursor.key] = cursor.value;

                // Move to the next record
                cursor.continue();

            }
            else {
                console.log("Retrieved cards from the store ", result);
                resolve(result);
            }
        };

        cursorRequest.onerror = function (event) {
            console.log("Error", cursorRequest.error);
            reject(event);
        };
    })
}

// Gets the stored absolute position of the provided card key id from the database
function getStoredPositionInDB(key) {
    return new Promise(function (resolve, reject) {
        let transaction = db.transaction("cards", "readonly"); // (1)

        // get an object store to operate on it
        let dbStore = transaction.objectStore("cards"); // (2)

        let cursorRequest = dbStore.openCursor(); // (3)

        cursorRequest.onsuccess = function (event) {
            let cursor = event.target.result;

            if (cursor) {
                if (cursor.key == key) {
                    resolve({
                        x: cursor.value.xPosition,
                        y: cursor.value.yPosition
                    });
                }
                
                // Move to the next record
                cursor.continue();

            }
            
        };

        cursorRequest.onerror = function (event) {
            console.log("Error", cursorRequest.error);
            reject(event)
        };
    })
}

window.addEventListener("load", onPageLoad());

async function onPageLoad() {
    // Loads the tarot JSON data
    loadTarotJson();

    
    while (tarotCardSuits == undefined) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait until the db is loaded
    }
    console.log("PageTitle: ", document.title, "\ndbLoaded?: ", tarotCardSuits);
    
    switch (document.title) {
        case "Tarot Page":
            // Set the hand card count box to the current card count in the database
            let cardCount = await countDBCards();
            if (cardCount != null) {
                document.getElementById("cardCountBox").innerHTML = cardCount;
            }
            break;
        case "Library Page":
            filterLibraryCards(null, -1);
            break;
    }
}

function loadLibraryCardsFromSuit() {
    let libraryList = document.getElementsByClassName("libraryList")[0];
    for (let cardIndex = 0; cardIndex < tarotCardSuits[currentFilterSuit].cards.length; cardIndex++) {
        let temp = document.getElementsByTagName("template")[0];
        let clon = temp.content.cloneNode(true);

        // Get the place for the data to be placed on the card
        let cardNumBox = clon.querySelector(".cardNum");
        cardNumBox.innerText = tarotCardSuits[currentFilterSuit].cards[cardIndex].number;

        let cardNameBox = clon.querySelector(".cardName");
        cardNameBox.innerText = tarotCardSuits[currentFilterSuit].cards[cardIndex].name;

        let cardDescUpBox = clon.querySelector(".cardDescUp");
        cardDescUpBox.innerText = tarotCardSuits[currentFilterSuit].cards[cardIndex].upright;

        let cardDescRevBox = clon.querySelector(".cardDescRev");
        cardDescRevBox.innerText = tarotCardSuits[currentFilterSuit].cards[cardIndex].reversed;



        let cardBase = clon.querySelector(".libraryCard");
        cardBase.setAttribute('suit', currentFilterSuit);

        libraryList.appendChild(clon);
    }
}

var currentFilterSuit = -1; // -1 means no filter, 0-3 are the suits
function filterLibraryCards(button, suit) {
    currentFilterSuit = suit;

    document.querySelectorAll(".librarySearch button").forEach(btn => {
        btn.style.backgroundColor = "#ffffff"; // Reset all button colors
    });

    if (button) {
        button.style.backgroundColor = "rgb(164, 164, 164)"; // Reset all button colors
    }
    else {
        document.querySelectorAll(".librarySearch button")[0].style.backgroundColor = "rgb(164, 164, 164)"; // Reset all button colors
    }

    //let libraryList = document.getElementsByClassName("libraryList")[0];
    //libraryList.innerHTML = ""; // Clear the library list

    //if (suit >= 0) {
    //    // Load cards from specific suit
    //    searchLibraryCardsFromSuit(suit);
    //}
    //else {
    //    // Load all cards from all suits
    //    for (let i = 0; i < tarotCardSuits.length; i++) {
    //        searchLibraryCardsFromSuit(i);
    //    }
    //}
    searchLibraryCards(null);
}

// Clears the search bar and resets the library cards to show all cards
function clearSearchBar() {
    document.getElementById("librarySearchBar").value = ""; // Clear the search bar
    currentSearchTerm = "";
    searchLibraryCards(null); // Redoes the search with an empty search term
}

var currentSearchTerm = ""; // The current search term in the library search bar
function searchLibraryCardsFromSuit(suit) {
    let libraryList = document.getElementsByClassName("libraryList")[0];
    for (let cardIndex = 0; cardIndex < tarotCardSuits[suit].cards.length; cardIndex++) {
        if (currentSearchTerm != null && currentSearchTerm.length > 0 && !tarotCardSuits[suit].cards[cardIndex].name.toLowerCase().includes(currentSearchTerm)) {
            continue; // Skip this card if it does not match the search term
        }

        let temp = document.getElementsByTagName("template")[0];
        let clon = temp.content.cloneNode(true);

        // Get the place for the data to be placed on the card
        let cardNumBox = clon.querySelector(".cardNum");
        cardNumBox.innerText = tarotCardSuits[suit].cards[cardIndex].number;

        let cardNameBox = clon.querySelector(".cardName");
        cardNameBox.innerText = tarotCardSuits[suit].cards[cardIndex].name;

        let cardDescUpBox = clon.querySelector(".cardDescUp");
        cardDescUpBox.innerText = tarotCardSuits[suit].cards[cardIndex].upright;

        let cardDescRevBox = clon.querySelector(".cardDescRev");
        cardDescRevBox.innerText = tarotCardSuits[suit].cards[cardIndex].reversed;



        let cardBase = clon.querySelector(".libraryCard");
        cardBase.setAttribute('suit', suit);

        libraryList.appendChild(clon);
    }
}
function searchLibraryCards(searchBar) {
    if (searchBar != null) {
        currentSearchTerm = searchBar.value.toLowerCase().trim();
    }

    let libraryList = document.getElementsByClassName("libraryList")[0];
    libraryList.innerHTML = ""; // Clear the library list

    if (currentFilterSuit >= 0) {
        // Load cards from specific suit
        searchLibraryCardsFromSuit(currentFilterSuit, currentSearchTerm);
    }
    else {
        // Load all cards from all suits
        for (let i = 0; i < tarotCardSuits.length; i++) {
            searchLibraryCardsFromSuit(i, currentSearchTerm);
        }
    }
}


/*var contentBox = document.getElementById("contentBox");*/

// Loads the tarot json from the JSON document
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
        //contentBox.innerHTML = "ERROR TarotCardsJSON not loaded!";
        alert("ERROR TarotCardsJSON not loaded! Please check the console for more information.");
        console.log("ERROR TarotCardsJSON not loaded!");
    }

    console.log("TAROT JSON LOADED.");
}

// Gets the card that is in the provided suit and index
function getTarotCard(suit, index) {
    return tarotCardSuits[suit].cards[index];
}

// Generates new card data
function generateCardData() {
    let randSuit = Math.floor(Math.random() * (tarotCardSuits.length));
    let randCardIndex = Math.floor(Math.random() * (tarotCardSuits[randSuit].cards.length - 1));
    return getTarotCard(randSuit, randCardIndex);
}

// Event handler for the draw tarot button; adds a new card to your hand
async function onGenerateTarot() {
    //// Set contentBox if it is not assigned already
    //if (contentBox == null) {
    //    contentBox = document.getElementById("contentBox");
    //}

    //let initRandCard = generateCardData();

    //// Set textbox to raw JSON data of the randomly drawn tarot card
    //contentBox.innerHTML = JSON.stringify(initRandCard);


    generateCards(1);

    document.getElementById("cardCountBox").innerHTML = await countDBCards();

    renderTarotCards();
}

function clearTarot() {
    let transaction = db.transaction("cards", "readwrite"); // (1)

    // get an object store to operate on it
    let cards = transaction.objectStore("cards"); // (2)

    let clearRequest = cards.clear();

    clearRequest.onsuccess = async function () {
        console.log('Card object store cleared successfully');
        renderTarotCards();
        document.getElementById("cardCountBox").innerHTML = await countDBCards();
    };

    clearRequest.onerror = (event) => {
        console.error('Error clearing object store:', event.target.errorCode);
    };
}

// Flips the card upright or viceversa
function flipCard(element) {
    if (document.querySelectorAll('.tarotCard').length > 0) {
        saveCardPositions();

    }

    let clickedCardID = element.getAttribute("card-id");
    console.log("ID:", clickedCardID);

    let transaction = db.transaction("cards", "readwrite"); // (1)

    // get an object store to operate on it
    let cards = transaction.objectStore("cards"); // (2)

    let cursorRequest = cards.openCursor(); // (3)

    cursorRequest.onsuccess = function (event) {
        let cursor = event.target.result;

        if (cursor) {
            if (cursor.key == clickedCardID) {
                console.log("Retrieved cards from the store", cursor.value);

                // Create a request to update
                cursor.value.isFlipped = !cursor.value.isFlipped
                const updateRequest = cursor.update(cursor.value);

                updateRequest.onsuccess = () => {
                    console.log("Card flipped ", updateRequest.result);
                }
                updateRequest.onerror = function () {
                    console.log("Error", updateRequest.error);
                };
            }

            // Move to the next record
            cursor.continue();
        }
        else {
            // Rerender cards if we flip one
            renderTarotCards();
        }

        
    };

    cursorRequest.onerror = function (event) {
        console.log("Error", cursorRequest.error);
    };
}

// Shrinks the text on the card so that it fits on the cards
function shrinkText(element) {
    let fontSize = 25; // Initial font size
    element.style.fontSize = fontSize + 'px';
    element.style.whiteSpace = 'nowrap'; // Prevent text wrapping

    // If we are already good, we can be done
    if (element.scrollWidth <= element.getBoundingClientRect().width) {
        return;
    }

    while (element.scrollWidth > element.getBoundingClientRect().width) {
        console.log("Width: ", element.scrollWidth, " Font Size: ", element.style.fontSize);
        fontSize -= 1; // Reduce font size
        element.style.fontSize = fontSize + 'px';

        if (fontSize <= 0) {
            console.error("Text cannot fit within the container.");
            return;
        }
    }

    // Remove an extra fontsize so that we are not at the edge
    element.style.fontSize = fontSize-1 + 'px';

    console.log(element.innerHTML,": ","Final Width: ", element.scrollWidth, " Font Size: ", element.width);
}

// Adds a new card to your hand
function drawCard(card, key) {
    let temp = document.getElementsByTagName("template")[0];
    let clon = temp.content.cloneNode(true);

    // Get the place for the data to be placed on the card
    let cardNumBox = clon.querySelector(".cardNum");
    let cardDescBox = clon.querySelector(".cardDesc");
    let cardNameBox = clon.querySelector(".cardName");
    let cardBase = clon.querySelector(".tarotCard");

    if (card.isFlipped) {
        // Show the text boxes
        cardNumBox.style.display = 'block';
        cardDescBox.style.display = 'block';
        cardNameBox.style.display = 'block';

        // Set the tarot card graphic's textboxes with the data provided
        cardNumBox.innerHTML = card.number;
        cardDescBox.innerHTML = card.meaning;
        cardNameBox.innerHTML = card.name + (card.isReversed ? " (R)" : "");
    }
    else {
        // Get the data from the randomly drawn tarot card into their respective places
        cardNumBox.style.display = 'none';
        cardDescBox.style.display = 'none';
        cardNameBox.style.display = 'none';

        cardBase.style.backgroundImage = "url('images/back.png')";
        
    }

    if (document.getElementById("playMat").classList.contains("gridMode")) {
        cardBase.float = 'none'; // If we are in grid mode, remove float
        cardBase.draggable = false; // If we are in grid mode, remove draggable
        cardBase.style.position = 'unset';
    }
    else {
        cardBase.float = 'left'; // If we are not in grid mode, set float to left
        cardBase.draggable = true; // If we are not in grid mode, set draggable to true
        
        let cardRect = document.getElementById("playMat").getBoundingClientRect();
        cardBase.style.position = 'absolute';

        

        cardBase.style.left = cardRect.left;
        cardBase.style.top = cardRect.top;
    }

    clon.querySelector(".tarotCard").setAttribute('card-id', key);
    clon.querySelector(".tarotCard").style.visibility = 'hidden';
    document.getElementById("playMat").appendChild(clon);
}

// Removes all rendered cards that are on the screen
function removeRenderedCards() {
    var cards = document.querySelectorAll('.tarotCard');

    cards.forEach(card => {
        card.remove();
    });
}

// This function spreads out recently spawned in cards so that they are not stacked
async function fixNewRenderedCards() {
    let cards = document.querySelectorAll('.tarotCard');

    for (let i = cards.length-1; i >= 0; i--) {
        let card = cards[i];

        if (document.getElementById("playMat").classList.contains("gridMode")) {
            // If we are in grid mode, we don't need to position the cards
            card.style.position = 'unset';
            card.style.visibility = 'visible';

            shrinkText(card.querySelector(".cardName"));
            card.style.visibility = 'visible';
            continue;
        }

        if (card.style.position != 'absolute') {
            let cardRect = card.getBoundingClientRect();
            card.style.position = 'absolute';

            let cardPos = await getStoredPositionInDB(card.getAttribute("card-id"));

            card.style.left = ((cardPos.x == -1) ? cardRect.left : cardPos.x);
            card.style.top = ((cardPos.y == -1) ? cardRect.top : cardPos.y);
        }

        fixShadowDir(card, document.getElementById("playMat"));
        shrinkText(card.querySelector(".cardName"));
        card.style.visibility = 'visible';
    }
    
}

// Rerenders the cards onto the screen
async function renderTarotCards() {
    if (document.querySelectorAll('.tarotCard').length > 0) {
        saveCardPositions();

    }

    removeRenderedCards();
    let cards = await getAllCardsInDB();
    console.log("Cards ",cards);

    if (cards == null) {
        console.log("NO TAROT CARDS STORED IN MEMORY; RENDER CANCELLED.")
        return;
    }

    console.log("RENDERING " + cards.length + " TAROT CARDS...");
    for (const key in cards) {
        drawCard(cards[key], key);
        console.log("Rendered card: ", cards[key].name);
    }

    fixNewRenderedCards();

    console.log("RENDERING of " + cards.length + " TAROT CARDS COMPLETED.");
}

// Saves the position of all the tarot cards on the screen
function saveCardPositions() {
    let transaction = db.transaction("cards", "readwrite"); // (1)

    // get an object store to operate on it
    let cards = transaction.objectStore("cards"); // (2)

    let cursorRequest = cards.openCursor(); // (3)

    
    var onScreenCards = document.querySelectorAll('.tarotCard');
    cursorRequest.onsuccess = function (event) {
        let cursor = event.target.result;

        if (cursor) {
            for (let i = 0; i < onScreenCards.length; i++) {
                let card = onScreenCards[i];
                if (card.getAttribute("card-id") == cursor.key) {
                    console.log("Retrieved cards from the store", cursor.value);

                    if (card.style.position == 'absolute') {
                        // Create a request to update
                        cursor.value.xPosition = card.style.left;
                        cursor.value.yPosition = card.style.top;
                        const updateRequest = cursor.update(cursor.value);

                        updateRequest.onsuccess = () => {
                            console.log("Card Position Updated ", updateRequest.result);
                        }
                        updateRequest.onerror = function () {
                            console.log("Error", updateRequest.error);
                        };
                    }
                    break;
                }
            }

            // Move to the next record
            cursor.continue();
        }

    };

    // If the cursor request failed
    cursorRequest.onerror = function (event) {
        console.log("Error", cursorRequest.error);
    };
}




// CARD DROPPAGE LOGIC ============================================================================================================================================================
// Some functions were remodeled from an stackoverflow question about dragging elements

let draggedElement = null;
let offsetX;
let offsetY;

// Event handler for the drag event starting
onDragStart = function (ev) {
    const rect = ev.target.getBoundingClientRect();

    offsetX = ev.screenX - rect.x;
    offsetY = ev.screenY - rect.y;

    draggedElement = ev.target;
    ev.dataTransfer.setData("text/plain", ""); // Required for Firefox
};

// Changes the direction of the drop shadow so it radiates as if a light were in the center of the screen
function fixShadowDir(draggedElement, playmat) {
    const lightSourceRect = playmat.getBoundingClientRect();
    const lightSourcePos = {
        x: (lightSourceRect.left + lightSourceRect.right) / 2,
        y: (lightSourceRect.top + lightSourceRect.bottom) / 2
    }

    const draggedElementRect = draggedElement.getBoundingClientRect();
    const draggedElementPos = {
        x: (draggedElementRect.left + draggedElementRect.right) / 2,
        y: (draggedElementRect.top + draggedElementRect.bottom) / 2
    }
    
    draggedElement.style.boxShadow = (draggedElementPos.x - lightSourcePos.x) / 10 + 'px ' + (draggedElementPos.y - lightSourcePos.y) / 10 + 'px 10px -10px #000000';
}

// Event handler for dropping a moved card
drop_handler = function (ev) {
    ev.preventDefault();

    const playmat = document.getElementById("playMat");    

    draggedElement.style.position = 'absolute';
    draggedElement.style.left = window.scrollX + ev.screenX - offsetX + 'px';
    draggedElement.style.top = window.scrollY + ev.screenY - offsetY + 'px';

    fixShadowDir(draggedElement, playmat);
    
    playmat.appendChild(draggedElement);
};

// Event handler for dragging and moving a card
dragover_handler = function (ev) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
};

// On page unload event handler
window.addEventListener('beforeunload', function (ev) {
    // If we got cards, save their positions before the page unloads
    if (document.querySelectorAll('.tarotCard').length > 0) {
        saveCardPositions();
        
    }
});


function toggleGridMode() {
    let playMat = document.getElementById("playMat");

    playMat.classList.toggle("gridMode");

    renderTarotCards(); // Rerender cards to apply the grid mode to them
}