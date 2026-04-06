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
    const titleInput = document.getElementById("logTitleInput");
    const dateInput = document.getElementById("logDateInput");
    const cardsInput = document.querySelectorAll("#logCardListData li");
    let cards = Array.from(cardsInput).map(li => li.getAttribute("data-card"));
    const interpretationInput = document.getElementById("logInterpretationInput");

    const logEntry = {
        title: titleInput.value,
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
    const openCursorRequest = logStore.openCursor();

    // Get the container element where log entries will be displayed
    const logEntriesContainer = document.getElementById("logEntriesContainer");

    // Clear existing entries before rendering new ones to avoid duplicates
    logEntriesContainer.innerHTML = "";

    openCursorRequest.onsuccess = (event) => {
        // Get the template element for log entries
        let temp = document.getElementsByTagName("template")[0];
        
        // Use the cursor to iterate through all log entries in the database
        const cursor = event.target.result;
        if (cursor) {
            // Get the log entry data from the cursor
            const entryValue = cursor.value;

            // Clone the template content
            const entryElement = temp.content.cloneNode(true);

            // Store the entry ID in the div for later reference (e.g., deletion)
            let logEntryDiv = entryElement.querySelector(".logEntry");
            logEntryDiv.dataset.key = cursor.key; // Store the entry ID in a data attribute for later reference (e.g., deletion)

            let titleHeader = entryElement.querySelector(".logTitle");
            titleHeader.textContent = entryValue.title;

            // Populate the cloned template with the log entry data
            let dateHeader = entryElement.querySelector(".logDate");
            dateHeader.textContent = new Date(entryValue.date).toLocaleString();
            dateHeader.dataset.date = entryValue.date;

            let cardList = entryElement.querySelector(".logCardList");
            cardList.textContent = entryValue.cards.join(", ");
            cardList.dataset.cards = entryValue.cards.join(", ");

            let interpretationText = entryElement.querySelector(".logInterpretationText");
            interpretationText.textContent = entryValue.interpretation;
            interpretationText.dataset.interpretation = entryValue.interpretation;

            // Append the populated template to the container element
            logEntriesContainer.appendChild(entryElement);

            console.log("Rendered log entry with ID: ", cursor.key, " and value: ", entryValue);

            // Move to the next entry
            cursor.continue();
        }
        else {
            console.log("All log entries rendered.");
        }
    };
}

function deleteLogEntry(button) {
    const logEntryElement = button.parentElement;
    console.log(logEntryElement);
    // const date = logEntryElement.querySelector(".logDate").dataset.date;
    // const interpretation = logEntryElement.querySelector(".logInterpretationText").dataset.interpretation;

    const transaction = logDb.transaction("logs", "readwrite");
    const logStore = transaction.objectStore("logs");
    const request = logStore.delete(Number(logEntryElement.dataset.key)); // Use the stored entry ID to delete the correct entry

    request.onsuccess = () => {
        console.log(`Deleted matching entry ${logEntryElement.dataset.key}.`);
    };

    renderLogEntries();
}

async function addCurrentCardsToLog() {
    addCardsToLog(await getCurrentCards());
}
function addCardsToLog(cards) {
    const cardsList = document.getElementById("logCardListData");
    cardsList.innerHTML += cards.map(card => `<li data-card="${card}"><button type="button" onclick="removeCardFromLog(this)">×</button>&emsp;${card}</li>`).join("");
}
async function getCurrentCards() {
    const cards = await getAllCardsInDB();

    return Object.values(cards).map(card => card.name+(card.isReversed ? " (R)" : ""));
}

function removeCardFromLog(button) {
    const li = button.parentElement;
    li.remove();
}

function exportLogEntries() {
    const transaction = logDb.transaction("logs", "readonly");
    const logStore = transaction.objectStore("logs");
    const openCursorRequest = logStore.openCursor();
    const logEntries = {logs: []};

    openCursorRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
            logEntries.logs.push(cursor.value);
            cursor.continue();
        }
        else {
            console.log("All log entries retrieved for export: ", logEntries);
            if (logEntries.logs.length === 0) {
                alert("No log entries to export.");
                return;
            }
            downloadJSON(logEntries);
        }
    };
        openCursorRequest.onerror = (event) => {
            console.error("Error retrieving log entries for export: ", event.target.error);
            alert("An error occurred while exporting log entries. Please try again.");
        };
}

function downloadJSON(data, filename = 'logEntries.json') {
    // 1. Convert the object to a formatted JSON string
    const jsonString = JSON.stringify(data, null, 2);

    // 2. Create a Blob with the JSON data
    const blob = new Blob([jsonString], { type: 'application/json' });

    // 3. Create a temporary anchor element
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;

    // 4. Trigger the download and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

function importLogs() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = JSON.parse(e.target.result);
            // Process the imported log entries
            if (data.logs && Array.isArray(data.logs)) {
                data.logs.forEach(logEntry => {
                    saveLogEntry(logEntry);
                });
                alert(`Successfully imported ${data.logs.length} log entries.`);
            } else {
                alert("Invalid log file format. Please ensure the JSON file has a 'logs' array.");
            }
        };
        reader.readAsText(file);
    };
    fileInput.click();

    // Clean up the file input element after use
    fileInput.remove();
}

function handleSuggestionSearchInput() {
    displayCardSearchResults(searchCardsForLog());
}

function searchCardsForLog() {
    const searchTerm = document.getElementById("logCardsInput").value.toLowerCase();
    const cardsList = tarotCardSuits.flatMap(suit => suit.cards);
    const matchingCards = Object.values(cardsList).filter(card => card.name.toLowerCase().includes(searchTerm));
    return matchingCards;
}

function displayCardSearchResults(cards) {
    // Get the container element for search results
    const searchResultsContainer = document.getElementById("logCardSearchResults");

    // Clear previous search results
    searchResultsContainer.innerHTML = "";

    // Display new search results as a list of buttons
    searchResultsContainer.innerHTML = cards.map(card => `<li data-card="${card.name}"><button type="button" onclick="handleAddCardToLog(this, false)">U</button><button type="button" onclick="handleAddCardToLog(this, true)">R</button>&emsp;${card.name}</li>`).join("");
}
function handleAddCardToLog(button, isReversed) {
    const cardName = button.parentElement.dataset.card+(isReversed ? " (R)" : "");
    addCardsToLog([cardName]);
}