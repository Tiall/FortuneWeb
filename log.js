// Opening a cardStorage database call request
var openRequest = indexedDB.open("cardStorage", 1);

// The db we get from the call request
var db;

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
};
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





// Opening a cardStorage database call request
var logRequest = indexedDB.open("logStorage", 2);

// The db we get from the call request
var logDb;

// On invalid database load
logRequest.onupgradeneeded = function () {
    // triggers if the client had no database
    // ...perform initialization...
    logDb = logRequest.result;
    if (!logDb.objectStoreNames.contains('logs')) { // if there's no "logs" store
        logDb.createObjectStore('logs', { autoIncrement: true }); // create it
    }
};

// On database failed connection
logRequest.onerror = function () {
    console.error("Error", logRequest.error);
};

// On database successful connection
logRequest.onsuccess = function () {
    logDb = logRequest.result;

    renderLogEntries();
};





// document.addEventListener("DOMContentLoaded", () => {
//     // Render log entries on page load
//     renderLogEntries();
//     console.log("Page loaded, log entries rendered.");
// });

function toggleLogForm() {
    const logForm = document.getElementById("logEntryForm");
    if (logForm.style.display === "none") {
        logForm.style.display = "block";
    } else {
        logForm.style.display = "none";
    }
}

// Handles the submission of the log entry form, creating a log entry object and saving it to the database
function submitLogEntry() {
    const dateInput = document.getElementById("logDateInput");
    const cardsInput = document.querySelectorAll("#logCardListData li");
    let cards = Array.from(cardsInput).map(li => li.getAttribute("data-card"));
    const interpretationInput = document.getElementById("logInterpretationInput");

    const logEntry = {
        date: dateInput.value,
        cards: cards,
        interpretation: interpretationInput.value
    };
    saveLogEntry(logEntry);
}
// TODO: This currently just adds the log entry to the database, but we should also display it on the page. We can do this by adding a function that retrieves all log entries from the database and displays them in a list on the page. We can call this function after saving a new log entry to update the displayed list of log entries.
// Saves the provided log entry to the database
function saveLogEntry(logEntry) {
    const transaction = logDb.transaction("logs", "readwrite");
    const logStore = transaction.objectStore("logs");
    logStore.add(logEntry);

    renderLogEntries();
}

function renderLogEntries() {
    const transaction = logDb.transaction("logs", "readonly");
    const logStore = transaction.objectStore("logs");
    const getAllRequest = logStore.getAll();
    getAllRequest.onsuccess = function () {
        const logEntries = getAllRequest.result;
        const logEntriesContainer = document.getElementById("logEntriesContainer");
        logEntriesContainer.innerHTML = ""; // Clear existing entries
        let temp = document.getElementsByTagName("template")[0];
        logEntries.forEach(entry => {
            const entryElement = temp.content.cloneNode(true);
            let dateHeader = entryElement.querySelector(".logDate");
            dateHeader.textContent = new Date(entry.date).toLocaleString();
            dateHeader.dataset.date = entry.date;
            
            let cardList = entryElement.querySelector(".logCardList");
            cardList.textContent = entry.cards.join(", ");
            cardList.dataset.cards = entry.cards.join(", ");

            let interpretationText = entryElement.querySelector(".logInterpretationText");
            interpretationText.textContent = entry.interpretation;
            interpretationText.dataset.interpretation = entry.interpretation;
            logEntriesContainer.appendChild(entryElement);
        });
    };
}

function deleteLogEntry(button) {
    const logEntryElement = button.parentElement;
    const date = logEntryElement.querySelector(".logDate").dataset.date;
    const interpretation = logEntryElement.querySelector(".logInterpretationText").dataset.interpretation;

    const transaction = logDb.transaction("logs", "readwrite");
    const logStore = transaction.objectStore("logs");
    const request = logStore.openCursor();

    request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
            // Check the data inside the object
            if (cursor.value.date === date && cursor.value.interpretation === interpretation) {
                cursor.delete(); // Deletes the current entry the cursor is on
                console.log("Deleted matching entry.");
                return; // Stop if you only want to delete one
            }
            cursor.continue(); // Move to the next entry
        }
    };

    renderLogEntries();
}

async function addCurrentCardsToLog() {
    const cardsList = document.getElementById("logCardListData");
    const currentCards = await getCurrentCards();

    cardsList.innerHTML = currentCards.map(card => `<li data-card="${card}"><button type="button" onclick="removeCardFromLog(this)">×</button>&emsp;${card}</li>`).join("");
}
async function getCurrentCards() {
    const cards = await getAllCardsInDB();

    return Object.values(cards).map(card => card.name);
}

function removeCardFromLog(button) {
    const li = button.parentElement;
    li.remove();
}