let books = [];
let watchList = [];

function col(row, i) {
    return (row[i] || '').trim();
}


async function fetchInventory() {
    const rows = await fetchSheetRange('inventory!A:B');
    return rows.map(row => ({
        author: col(row, 0),
        title: col(row, 1),
    })).filter(r => r.author);
}

async function fetchWatchList() {
    const rows = await fetchSheetRange('E:L');
    return rows.map(row => ({
        title: col(row, 0),
        firstName: col(row, 1),
        lastName: col(row, 2),
        dateFound: col(row, 7),
    })).filter(r => r.lastName && !r.dateFound);
}

function normalize(str) {
    return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, '');
}

const STOP_WORDS = new Set([
    'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to',
    'for', 'and', 'or', 'but', 'with', 'by', 'from',
]);

function titleMatchesQuery(inventoryTitle, queryTitle) {
    const getWords = str => normalize(str).split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
    const wordsA = getWords(inventoryTitle);
    const wordsB = getWords(queryTitle);
    const shorter = wordsA.length <= wordsB.length ? wordsA : wordsB;
    const longer = wordsA.length <= wordsB.length ? wordsB : wordsA;
    if (shorter.length === 0) return false;
    return shorter.filter(w => longer.includes(w)).length / shorter.length >= 0.6;
}

function getQueryTokens(query) {
    return normalize(query).split(/[\s,]+/).filter(t => t);
}

function authorMatchesTokens(author, queryTokens) {
    const firstAuthor = normalize(author).split(/\band\b|&/)[0];
    const authorTokens = firstAuthor.split(/[\s,]+/);
    return queryTokens.every(qt => authorTokens.some(at => at.startsWith(qt)));
}

function watchEntryMatchesTokens(entry, queryTokens) {
    const nameTokens = [entry.firstName, entry.lastName]
        .filter(t => t)
        .map(normalize);
    return queryTokens.every(qt => nameTokens.some(nt => nt.startsWith(qt)));
}

function renderResults(query, title) {
    const inventoryEl = document.getElementById('csv-results');
    const watchEl = document.getElementById('watch-select');

    if (!query) {
        inventoryEl.innerHTML = '';
        watchEl.innerHTML = '';
        return;
    }

    const queryTokens = getQueryTokens(query);

    const inventoryMatches = books
        .filter(b => authorMatchesTokens(b.author, queryTokens))
        .filter(b => !title || titleMatchesQuery(b.title, title))
        .sort((a, b) => a.author.localeCompare(b.author));
    inventoryEl.innerHTML = inventoryMatches.map(b => `
        <div class="result-item">
            <span class="result-author">${b.author}</span>
            <span class="result-title">${b.title}</span>
        </div>
    `).join('');

    const watchMatches = watchList
        .filter(w => watchEntryMatchesTokens(w, queryTokens))
        .sort((a, b) => a.lastName.localeCompare(b.lastName));
    watchEl.innerHTML = watchMatches.map(w => `
        <div class="result-item">
            <span class="result-author">${w.lastName}, ${w.firstName}</span>
            <span class="result-title">${w.title}</span>
        </div>
    `).join('');
}

async function fetchByIsbn(isbn) {
    const info = await fetchGoogleBookByIsbn(isbn);
    return { author: (info.authors || [])[0] || '', title: info.title || '' };
}

async function init() {
    try {
        await Promise.all([
            fetchInventory().then(list => { books = list; }),
            fetchWatchList().then(list => { watchList = list; })
        ]);
    } catch (error) {
        alert(error.toString());
    }

    document.getElementById('isbn-form').addEventListener('submit', async function (event) {
        event.preventDefault();
        let isbn = document.getElementById('isbn-input').value.replace(/[\s-]/g, '');
        if (isbn.length === 9) isbn = '0' + isbn;
        if (!isbn) return;
        try {
            const { author, title } = await fetchByIsbn(isbn);
            const authorSearch = document.getElementById('author-search');
            authorSearch.value = author;
            renderResults(author.trim(), title);
        } catch (error) {
            alert(error.toString());
        }
    });

    document.getElementById('author-search').addEventListener('input', function () {
        renderResults(this.value.trim());
    });

    document.getElementById('isbn-input').focus();
}

window.addEventListener('load', init);
