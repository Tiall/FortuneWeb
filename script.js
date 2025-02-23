// The promise loaded from the TarotMeanings JSON
var tarotCardSuits;

// Opening a database call request
var openRequest = indexedDB.open("cardStorage", 1);
// The db we get from the call request
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
    repairOldCards();
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
                // Replace the out of data card with a new random card. I COULD CHANGE THIS IN THE FUTURE POTENTIALLY... ??? ???? ?????
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

// Replaces all cards in the database with a new card, but at the position they are currently so spread layouts will stay the same
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
function generateCards(amt) {
    let transaction = db.transaction("cards", "readwrite"); // (1)

    // get an object store to operate on it
    let cards = transaction.objectStore("cards"); // (2)

    //let randCards = [];
    for (let i = 0; i < amt; i++) {
        //randCards.push(generateCardDataNums());
        

        let fullCardObj = generateCard();
        console.log(fullCardObj);

        storeCardInDB(fullCardObj, cards);
    }
}
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

function getAllCardsInDB() {
    return new Promise(function (resolve, reject) {
        let transaction = db.transaction("cards", "readonly"); // (1)

        // get an object store to operate on it
        let dbStore = transaction.objectStore("cards"); // (2)

        let cursorRequest = dbStore.openCursor(); // (3)

        //request.onsuccess = (event) => { // (4)
        //    console.log("Retrieved cards from the store", event.target.result);
        //    resolve(event.target.result);
        //};

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
            reject(event)
        };
    })
}

function getStoredPositionInDB(key) {
    return new Promise(function (resolve, reject) {
        let transaction = db.transaction("cards", "readonly"); // (1)

        // get an object store to operate on it
        let dbStore = transaction.objectStore("cards"); // (2)

        let cursorRequest = dbStore.openCursor(); // (3)

        //request.onsuccess = (event) => { // (4)
        //    console.log("Retrieved cards from the store", event.target.result);
        //    resolve(event.target.result);
        //};
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

function generateCardData() {
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

    let initRandCard = generateCardData();
    //console.log(JSON.stringify(initRandCard));

    // Set textbox to raw JSON data of the randomly drawn tarot card
    contentBox.innerHTML = JSON.stringify(initRandCard);


    generateCards(1);


}

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

function drawCard(card, key) {
    let temp = document.getElementsByTagName("template")[0];
    let clon = temp.content.cloneNode(true);

    //// Add the cards data onto the card graphic so that we can pull from the data later if needed
    //clon.setAttribute("data-cardID", card.key);

    // Get the place for the data to be placed on the card
    let cardNumBox = clon.querySelector(".cardNum");
    let cardDescBox = clon.querySelector(".cardDesc");
    let cardNameBox = clon.querySelector(".cardName");

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
        // Do something
        // Get the data from the randomly drawn tarot card into their respective places
        cardNumBox.style.display = 'none';
        cardDescBox.style.display = 'none';
        cardNameBox.style.display = 'none';

    }

    clon.querySelector(".tarotCard").setAttribute('card-id', key);
    clon.querySelector(".tarotCard").style.visibility = 'hidden';
    document.getElementById("playMat").appendChild(clon);
}

function removeRenderedCards() {
    var cards = document.querySelectorAll('.tarotCard');

    cards.forEach(card => {
        card.remove();
    });
}

async function fixNewRenderedCards() {
    let cards = document.querySelectorAll('.tarotCard');

    for (let i = cards.length-1; i >= 0; i--) {
        let card = cards[i];

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

    cursorRequest.onerror = function (event) {
        console.log("Error", cursorRequest.error);
    };
}




// CARD DROPPAGE LOGIC ============================================================================================================================================================

let draggedElement = null;
let offsetX;
let offsetY;

onDragStart = function (ev) {
    const rect = ev.target.getBoundingClientRect();

    offsetX = ev.clientX - rect.x;
    offsetY = ev.clientY - rect.y;

    draggedElement = ev.target;
    ev.dataTransfer.setData("text/plain", ""); // Required for Firefox
};

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
    //console.log("X: ", (draggedElementPos.x - lightSourcePos.x) / 10, " Y: ", (draggedElementPos.y - lightSourcePos.y) / 10);
    draggedElement.style.boxShadow = (draggedElementPos.x - lightSourcePos.x) / 10 + 'px ' + (draggedElementPos.y - lightSourcePos.y) / 10 + 'px 10px -10px #000000';
}

drop_handler = function (ev) {
    ev.preventDefault();

    const playmat = document.getElementById("playMat");    

    draggedElement.style.position = 'absolute';
    draggedElement.style.left = ev.clientX - offsetX + 'px';
    draggedElement.style.top = ev.clientY - offsetY + 'px';

    fixShadowDir(draggedElement, playmat);

    //draggedElement.style.boxShadow = '10px 10px 10px #000000';
    playmat.appendChild(draggedElement);
};

dragover_handler = function (ev) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
};

window.addEventListener('beforeunload', function (ev) {
    // If we got cards, save their positions before the page unloads
    if (document.querySelectorAll('.tarotCard').length > 0) {
        saveCardPositions();
        
    }
    


});