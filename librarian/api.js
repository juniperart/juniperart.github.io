const apikey = 'AIzaSyA_arhU6mmyfFViFKbuSezjVoenUzxTpeE';
const SPREADSHEET_ID = '13FXyHziavv5lBiIBafV5TF4fnBcthYbHv8zst_pjddA';

// Super-soft title matching: parenthetical content (edition, award badges,
// series numbers, anything) and bracketed catalog IDs ("[B1837]") are never
// part of a book's core identity, and anything after the first colon is
// treated as subtitle/noise too - only the text before the colon is compared.
// This is intentionally loose: it's what makes e.g. a large-print copy match
// its regular counterpart, at the cost of also glossing over small wording
// differences (typos, near-duplicate titles) before the colon.
function stripTitleNoise(title) {
    return title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').split(':')[0].trim();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Retries only transient failures (5xx / dropped connection) with backoff.
// A 4xx (bad request, real quota rejection, etc.) returns immediately since
// retrying it won't help.
async function fetchWithRetry(url, { retries = 2, delayMs = 600 } = {}) {
    for (let attempt = 0; ; attempt++) {
        try {
            const response = await fetch(url);
            const text = await response.text();
            const data = text ? JSON.parse(text) : null;
            const isRetryable = response.status >= 500;
            if (response.ok || !isRetryable || attempt >= retries) {
                return { response, data, text };
            }
        } catch (networkError) {
            if (attempt >= retries) throw networkError;
        }
        await sleep(delayMs * (attempt + 1));
    }
}

// Google's isbn: search has been known to silently return zero results for
// every ISBN, so when Google fails or comes up empty we fall back to Open
// Library. Both paths return the Google volumeInfo shape callers expect.
// Every step logs with a [Book lookup] prefix, ending in a summary of which
// source supplied each field.
async function fetchGoogleBookByIsbn(isbn) {
    const log = (...args) => console.info(`[Book lookup] ${isbn}:`, ...args);
    let googleError;
    try {
        const { response, data, text } = await fetchWithRetry(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apikey}`);
        if (!response.ok) {
            log(`Google ISBN search: error ${response.status}`, data);
            googleError = `Google Books API error\nStatus: ${response.status} ${response.statusText}\n${text || '(empty response body)'}`;
        } else if (data?.items?.length) {
            const info = data.items[0].volumeInfo;
            log(`Google ISBN search: found "${info.title}"`);
            logSources(isbn, info, { all: 'Google ISBN search (exact edition)' });
            return info;
        } else {
            log('Google ISBN search: no matches, trying Open Library', data);
        }
    } catch (error) {
        log('Google ISBN search: request failed, trying Open Library', error);
        googleError = `Google Books API request failed: ${error}`;
    }

    const openLibraryInfo = await fetchOpenLibraryBookByIsbn(isbn);
    if (!openLibraryInfo) {
        log('Open Library: no match');
        throw new Error(googleError ? `${googleError}\n\nOpen Library also had no match.` : 'No data returned for ISBN (checked Google Books and Open Library)');
    }
    log(`Open Library: found "${openLibraryInfo.title}" by ${openLibraryInfo.authors.join(', ') || '(no author)'}`);

    const sources = {
        title: 'Open Library',
        authors: 'Open Library',
        publishedDate: 'Open Library',
        description: openLibraryInfo.description ? 'Open Library' : '(none)'
    };
    try {
        const googleMatch = await fetchGoogleMatchByTitle(openLibraryInfo.title, openLibraryInfo.authors);
        if (googleMatch) {
            const ids = (googleMatch.industryIdentifiers || []).map(x => x.identifier).join(', ') || 'no ISBN';
            const googleSource = `Google keyword search ("${googleMatch.title}", ${ids})`;
            log(`Google keyword search: matched "${googleMatch.title}${googleMatch.subtitle ? ': ' + googleMatch.subtitle : ''}" (${ids})`);
            // Keep Open Library's subtitle: the match may be another edition,
            // and its subtitle can be packaging ("Rejacketed") or an adaptation.
            openLibraryInfo.title = googleMatch.title;
            // Google sometimes folds the subtitle into the title.
            const squash = text => (text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (openLibraryInfo.subtitle && squash(googleMatch.title).endsWith(squash(openLibraryInfo.subtitle))) {
                openLibraryInfo.subtitle = undefined;
            }
            sources.title = googleSource;
            // Open Library tends to give full legal names; Google, the cover name.
            const surnameOf = name => normalizeForMatch(name).split(' ').pop();
            const googleAuthor = (googleMatch.authors || [])[0];
            if (googleAuthor && openLibraryInfo.authors[0] && surnameOf(googleAuthor) === surnameOf(openLibraryInfo.authors[0])) {
                openLibraryInfo.authors[0] = googleAuthor;
                sources.authors = googleSource;
            }
            if (!openLibraryInfo.description && googleMatch.description) {
                openLibraryInfo.description = googleMatch.description;
                sources.description = googleSource;
            }
        } else {
            log('Google keyword search: no matching result, keeping Open Library title');
        }
    } catch (error) {
        log('Google keyword search: request failed, keeping Open Library title', error);
    }
    logSources(isbn, openLibraryInfo, sources);
    return openLibraryInfo;
}

function logSources(isbn, info, sources) {
    const fullTitle = `${info.title || ''}${info.subtitle ? ': ' + info.subtitle : ''}`;
    console.info(`[Book lookup] ${isbn}: sources`);
    console.table({
        title: { value: fullTitle, source: sources.all || sources.title },
        author: { value: (info.authors || []).join(', '), source: sources.all || sources.authors },
        year: { value: info.publishedDate || '', source: sources.all || sources.publishedDate },
        description: { value: (info.description || '').slice(0, 60), source: sources.all || sources.description }
    });
}

// Leading articles are dropped since sources disagree on them
// ("Kite Runner 20th Anniversary Edition" vs "The Kite Runner 20th ...").
function normalizeForMatch(text) {
    return stripTitleNoise(text || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().replace(/^(the|a|an) /, '');
}

// Google's plain (non-field-restricted) search still works, so search by
// title + author and use a result whose title and first author's surname match
// for the title, subtitle and description. It may be a different edition, but
// it's the same book, and summaries/study guides get filtered out. Only
// English results count - a title search also returns translations, which
// often keep the English title (e.g. an Indonesian "The Kite Runner").
// Special editions are skipped unless the book we're looking up is one.
// Results with a description and no subtitle are preferred.
async function fetchGoogleMatchByTitle(title, authors) {
    const author = (authors || [])[0];
    if (!title || !author) return undefined;
    const surname = normalizeForMatch(author).split(' ').pop();
    const query = encodeURIComponent(`${title} ${author}`);
    const { response, data } = await fetchWithRetry(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=10&key=${apikey}`);
    if (!response.ok) return undefined;
    const wantedTitle = normalizeForMatch(title);
    const specialEdition = /edition|illustrated|deluxe|slipcase|box(ed)? set|large print|abridged|collector|anniversary|annotated/i;
    const wantSpecialEdition = specialEdition.test(title);
    const matches = (data?.items || []).map(i => i.volumeInfo).filter(v =>
        v.title
        && v.language === 'en'
        && normalizeForMatch(v.title) === wantedTitle
        && (wantSpecialEdition || !specialEdition.test(`${v.title} ${v.subtitle || ''}`))
        && normalizeForMatch((v.authors || [])[0]).split(' ').includes(surname)
    );
    // Subtitled records are often adaptations or reissues ("Graphic Novel",
    // "Rejacketed") and their subtitle gets copied onto the title, so prefer
    // one without a subtitle.
    return matches.find(v => v.description && !v.subtitle)
        || matches.find(v => v.description)
        || matches[0];
}

async function fetchOpenLibraryBookByIsbn(isbn) {
    const key = `ISBN:${isbn}`;
    const { response, data } = await fetchWithRetry(`https://openlibrary.org/api/books?bibkeys=${key}&format=json&jscmd=data`);
    const book = response.ok ? data?.[key] : null;
    if (!book) return null;
    return {
        title: book.title,
        subtitle: book.subtitle,
        authors: (book.authors || []).map(a => a.name),
        publishedDate: book.publish_date,
        description: typeof book.description === 'string' ? book.description : book.description?.value
    };
}

async function fetchSheetRange(range) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${apikey}`;
    const { response, data, text } = await fetchWithRetry(url);
    if (!response.ok) {
        console.error('Google Sheets API response:', data);
        throw new Error(`Google Sheets API error\nStatus: ${response.status} ${response.statusText}\n${text || '(empty response body)'}`);
    }
    return (data.values || []).slice(1);
}
