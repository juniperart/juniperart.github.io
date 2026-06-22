const reviewPlaceholder = 'From recent Amazon/GoodReads reviews: ""; ""; ""';

let isbnInput
let formatSelect
let conditionSelect
let titleInput
let authorInput
let descriptionInput
let links
let output
let keywords
let photos
let checkboxContainer
let checkboxes
let lookupBtn
let previousButton
let copyPreviousModal
let modalContent
let copiedText
let generateArray = []
let isbn = ''
let lookupDone = false
let generatedSuccessfully = false
let inventory = []
let watchList = []
// defines objects
function defineObjects() {
    isbnInput = document.getElementById("isbn-input")
    formatSelect = document.getElementById("format-select")
    conditionSelect = document.getElementById("condition-select")
    titleInput = document.getElementById("title-input")
    authorInput = document.getElementById("author-input")
    descriptionInput = document.getElementById("description-input")
    links = document.getElementById("links")
    output = document.getElementById('output')
    keywords = document.getElementById("keywords-input")
    photos = document.getElementById("photos")
    checkboxContainer = document.getElementById('checkbox-container');
    checkboxes = document.getElementsByName('checkbox');
    lookupBtn = document.getElementById('lookup-btn')
    previousButton = document.getElementById('previousButton')
    copyPreviousModal = document.getElementById('copyPreviousModal')
    modalContent = document.getElementById('modalContent')
    copiedText = document.querySelector('.check')
}

function formatAuthorNames(authors) {
    let formattedAuthors = '';
    // Format the first author
    if (authors[0]) {
        let authorParts = authors[0].split(' ');
        let firstName = authorParts[0];
        let lastName = authorParts[authorParts.length - 1];
        let middleNames = authorParts?.slice(1, authorParts.length - 1).join(' ');
        formattedAuthors = `${lastName}, ${firstName}` 
        if (middleNames) {
            formattedAuthors += ` ${middleNames}`;
        }
    }

    // Add the second author, and 'et al.'
    if (authors.length > 1) {
        formattedAuthors += ` and ${authors[1]}`
    }
    if (authors.length > 2) {
        formattedAuthors += ', et al.'
    }

    return formattedAuthors;
}

function extractYear(dateString) {
    let dateObj;
    if (dateString.length === 4) {
        return dateString;
    } else {
        dateObj = new Date(dateString);
    }
    const year = dateObj.getFullYear();
    return year;
}

function copyToClipboard(outputText, index) {
    let outputStr
    if (outputText) {
        outputStr = outputText
    } else if (index !== false) {
        outputStr = generateArray[index][1]
        document.querySelectorAll('.previousButton')[index].style.backgroundColor = '#039318'
        setTimeout(() => {
            closeModal()
        }, 500);
    } else {
        outputStr = output.value
    }
    navigator.clipboard.writeText(outputStr)
        .then(() => {
            setCopied(true);
        })
        .catch(err => {
            console.error("Failed to copy text: ", err);
        });
}

function generate(generate) {
    if (!titleInput.value && generate) {
        alert('Please enter a title.')
    } else if (!authorInput.value && generate) {
        alert('Please enter an author.')
    } else if (titleInput.value) {
        let title = titleInput.value
        let cleanDescription = descriptionInput.value
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2026]/g, '...')
        .replace(/[\u2013\u2014\u2019]/g, '-')
        .replace(/[\u2122]/g, '')
        .replace(/(\r\n|\n|\r)/gm, '</p><p>')
        cleanDescription = '<p>' + cleanDescription + '</p>'
        let outputText = `${title}{${authorInput.value}{${cleanDescription}{${getCheckedValues()}{${isbn}`
        outputText = outputText.replace(/(\r\n|\n|\r)/gm, "")
        output.value = outputText;
        if (generate) {
            copyToClipboard(outputText)
            generatedSuccessfully = true
            checkInventory(title, authorInput.value)
            checkWatchList(title, authorInput.value)
        }
        if (generateArray[0] && generateArray[0][0] === title) {
            generateArray.shift()
        }
        generateArray.unshift([
            title,
            outputText
        ])
    }
}

function setCopied(copied) {
    if (copied) {
        copiedText.style.display = 'inline-block';
    } else {
        copiedText.style.display = 'none';
    }
}

function clearAndFocus() {
    if (isbnInput.value.length) generate(false)
    isbnInput.value = "";
    isbnInput.focus();

    formatSelect.value = '';
    conditionSelect.value = '';
    titleInput.value = '';
    authorInput.value = '';
    descriptionInput.value = '';
    links.innerHTML = '';
    output.value = '';
    photos.innerHTML = '';
    setCopied(false);
    isbn = ''
    lookupDone = false
    generatedSuccessfully = false
    lookupBtn.disabled = false;

    checkboxes?.forEach(x => {
        x.checked = false
    })
}

const checkboxValues = [
    "Featured",
    "LGBTQ",
    "True-Crime",

    "Graphic-Novel",
    "L-P",
    "UU",

    "Holiday",
    "PNW",
    "Women",

    "Justice",
    "Signed",
    "World-Language",
];

function renderCheckboxes() {
    const numColumns = 3;
    const numRows = Math.ceil(checkboxValues.length / numColumns);
    const checkboxTemplate = document.createElement('template');
    checkboxTemplate.innerHTML = `<div class="checkbox-column"></div>`;
    for (let i = 0; i < numColumns; i++) {
        checkboxContainer.appendChild(checkboxTemplate.content.cloneNode(true));
    }
    const columns = document.getElementsByClassName('checkbox-column');
    let index = 0;
    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numColumns; j++) {
            if (index < checkboxValues.length) {
                const checkboxLabel = checkboxValues[index];
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.name = 'checkbox';
                checkbox.value = checkboxLabel;
                checkbox.id = checkboxLabel
                const label = document.createElement('label');
                label.textContent = checkboxLabel;
                label.classList.add('checkbox-label');
                label.htmlFor = checkboxLabel;
                columns[j].appendChild(checkbox);
                columns[j].appendChild(label);
                index++;
            }
        }
    }
}

function getCheckedValues() {
    const checkedValues = [];
    for (let i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].checked) {
            checkedValues.push(checkboxes[i].value);
        }
    }
    return checkedValues.join(',');
}

function buildDescriptor(year) {
    const parts = year ? [year] : [];
    if (formatSelect.value) parts.push(formatSelect.value);
    if (conditionSelect.value) parts.push(conditionSelect.value);
    if (parts.length === 0) return null;
    return parts.join(' ') + '.';
}

function formatBookInfo(googleBookData, isbn) {
    const subtitle = googleBookData.subtitle ? `: ${googleBookData.subtitle}` : '';
    const formattedTitle = `${googleBookData.title}${subtitle}`
    let bookData = {
        title: formattedTitle,
        author: formatAuthorNames(googleBookData.authors),
        description: (() => {
            const descriptor = buildDescriptor(extractYear(googleBookData.publishedDate));
            const bookDesc = googleBookData.description || '';
            const mainLine = descriptor ? `${descriptor}${bookDesc ? ' ' + bookDesc : ' '}` : bookDesc;
            return `${mainLine}\n${reviewPlaceholder}`;
        })(),
        isbn: isbn
    }
    return bookData;
}

async function getImages(isbn) {
    const hrefs = await getGoogleImageSearchResult(isbn)
    addImages(hrefs)
}

function addImages(hrefs) {
    photos.innerHTML = ''
    hrefs?.forEach(x => {
        photos.innerHTML += `<img src="${x}" />`
    })
    setTimeout(() => {
        const images = Array.from(document.querySelectorAll('#photos img'))
        images?.forEach(x => {
            let info = document.createElement('span')
            info.textContent = `${x.naturalWidth}x${x.naturalHeight}`;
            photos.insertBefore(info, x)
        })
    }, 1500);
}

async function fetchBookInfo(isbn) {
    await getImages(isbn);
    const volumeInfo = await fetchGoogleBookByIsbn(isbn);
    setCopied(false);
    return formatBookInfo(volumeInfo, isbn);
}

async function getGoogleImageSearchResult(isbn) {
    const numberOfResults = 4;
    const searchEngineID = "511ac3198aa8e497a";
    const url = "https://www.googleapis.com/customsearch/v1?key=" + apikey + "&cx=" + searchEngineID
        + "&q=" + isbn + "&num=10&searchType=image";

    const response = await fetch(url);
    const data = await response.json();
    const urls = data?.items?.map(x => {
        if (x.link && x.link.includes('.jpg')) return `${x.link.split('.jpg')[0]}.jpg`
    }).filter(x => x)

    return urls?.slice(0, numberOfResults);
}

function copyPrevious() {
    if (!generateArray.length) {
        alert('No previous books.')
        return
    }
    copyPreviousModal.style.display = 'block'
    for (let i = 0; i < generateArray.length && i < 10; i++ ) {
        modalContent.innerHTML += `
            <div class="row">
                <button class="previousButton" onclick="copyToClipboard(false, ${i})">Copy</button>
                <p class="previousTitle">${generateArray[i][0]}</p>
            </div>
        `
    }
}

function closeModal() {
    copyPreviousModal.style.display = 'none'
    modalContent.innerHTML = ''
}

function onClearClick() {
    if (lookupDone && !generatedSuccessfully) {
        openClearModal();
    } else {
        clearAndFocus();
    }
}

function openClearModal() {
    document.getElementById('clearModal').style.display = 'block';
}

function closeClearModal() {
    document.getElementById('clearModal').style.display = 'none';
}

function confirmClear() {
    closeClearModal();
    clearAndFocus();
}

// Listen for submit event on ISBN form
document.getElementById("isbn-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    isbn = isbnInput.value.replace(/[\s-]/g, '');
    if (isbn.length === 9) isbn = '0' + isbn;
    isbnInput.value = isbn;
    lookupBtn.disabled = true;


    if (!isbn.length) {
        const descriptor = buildDescriptor(null);
        const firstLine = descriptor ? `${descriptor} \n` : '\n';
        descriptionInput.value = `${firstLine}${reviewPlaceholder}`;
        lookupDone = true;
        return;
    }

    if (/^\d{4}$/.test(isbn)) {
        const descriptor = buildDescriptor(isbn);
        descriptionInput.value = `${descriptor} \n${reviewPlaceholder}`;
        lookupDone = true;
        return;
    }

    try {
        const bookData = await fetchBookInfo(isbn);

        // Populate fields in book form using bookData
        titleInput.value = bookData.title;
        authorInput.value = bookData.author;
        descriptionInput.value = bookData.description;
        lookupDone = true;
        checkInventory(bookData.title, bookData.author);
        checkWatchList(bookData.title, bookData.author);
        links.innerHTML = `
        <p><a href="https://www.amazon.com/s?i=stripbooks&rh=p_66%3A${isbn}&s=relevanceexprank&Adv-Srch-Books-Submit.x=35&Adv-Srch-Books-Submit.y=12&unfiltered=1&ref=sr_adv_b" target="_blank">Amazon</a>
        <p><a href="https://www.ebay.com/sh/research?marketplace=EBAY-US&keywords=${isbn}&dayRange=90&endDate=1680216616964&startDate=1672444216964&categoryId=0&offset=0&limit=50&tabName=SOLD&tz=America%2FLos_Angeles" target="_blank">Ebay</a>
    `;
    } catch (error) {
        alert(error.toString());
        const descriptor = buildDescriptor(null);
        const firstLine = descriptor ? `${descriptor} \n` : '\n';
        descriptionInput.value = `${firstLine}${reviewPlaceholder}`;
        lookupDone = true;
    }
});

// Listen for submit event on book form
document.getElementById("book-form").addEventListener("submit", function (event) {
    event.preventDefault();

    // Create JSON object with form data
    const formData = {
        title: document.getElementById("title-input").value,
        author: document.getElementById("author-input").value,
        description: document.getElementById("description-input").value,
        keywords: document.getElementById("keywords-input").value,
    };
});

const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'or', 'but', 'with', 'by', 'from']);

function normalizeStr(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, '');
}

function getNameTokens(author) {
    return normalizeStr(author).split(/[\s,]+/).filter(t => t.length > 1);
}

function getTitleWords(title) {
    return normalizeStr(title).split(/[\s:,\-]+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function authorsLooselyMatch(a, b) {
    const tokensA = getNameTokens(a);
    const tokensB = getNameTokens(b);
    const lastA = tokensA[0];
    const lastB = tokensB[0];
    if (!lastA || lastA !== lastB) return false;
    const firstA = tokensA.slice(1);
    const firstB = tokensB.slice(1);
    return firstA.some(ta => firstB.some(tb => ta.startsWith(tb) || tb.startsWith(ta)));
}

function titlesLooselyMatch(a, b) {
    const wordsA = getTitleWords(a);
    const wordsB = getTitleWords(b);
    const shorter = wordsA.length <= wordsB.length ? wordsA : wordsB;
    const longer = wordsA.length <= wordsB.length ? wordsB : wordsA;
    if (shorter.length === 0) return false;
    const overlap = shorter.filter(w => longer.includes(w));
    return overlap.length / shorter.length >= 0.6;
}

function lastNamesMatch(a, b) {
    return getNameTokens(a)[0] === normalizeStr(b).split(/[\s,]+/)[0];
}

function showInfoModal(modalId, matchHtml) {
    document.getElementById(modalId + 'Match').innerHTML = matchHtml;
    document.getElementById(modalId).style.display = 'block';
}

function closeInfoModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function checkInventory(title, author) {
    const match = inventory.find(item =>
        lastNamesMatch(author, item.author) && titlesLooselyMatch(title, item.title)
    );
    if (match) showInfoModal('inventoryModal', `<b>${match.author}</b> — ${match.title}`);
}

function isAnyTitle(title) {
    return /\bany\b/i.test(title);
}

function parseExceptions(title) {
    const exceptIdx = title.search(/\bexcept\b/i);
    if (exceptIdx === -1) return [];
    const afterExcept = title.slice(exceptIdx + 6).replace(/^[\s:(]+/, '');
    return afterExcept.split(';').map(part =>
        part.replace(/\[.*?\]/g, '').replace(/[()]/g, '').trim()
    ).filter(t => t.length > 2);
}

function checkWatchList(title, author) {
    const match = watchList.find(item => {
        if (!lastNamesMatch(author, item.lastName)) return false;
        if (isAnyTitle(item.title)) {
            const exceptions = parseExceptions(item.title);
            return !exceptions.some(exc => titlesLooselyMatch(title, exc));
        }
        return titlesLooselyMatch(title, item.title);
    });
    if (match) showInfoModal('watchListModal', `<b>${match.lastName}, ${match.firstName}</b> — ${match.title}`);
}

window.addEventListener("load", async function () {
    document.getElementById("isbn-input").focus();
    defineObjects()
    renderCheckboxes()
    try {
        const [invRows, watchRows] = await Promise.all([
            fetchSheetRange('inventory!A:B'),
            fetchSheetRange('E:L')
        ]);
        inventory = invRows.map(row => ({
            author: (row[0] || '').trim(),
            title: (row[1] || '').trim(),
        })).filter(r => r.author);
        watchList = watchRows.map(row => ({
            title: (row[0] || '').trim(),
            firstName: (row[1] || '').trim(),
            lastName: (row[2] || '').trim(),
            dateFound: (row[7] || '').trim(),
        })).filter(r => r.lastName && !r.dateFound);
    } catch (error) {
        console.error('Failed to load data:', error);
    }
});
