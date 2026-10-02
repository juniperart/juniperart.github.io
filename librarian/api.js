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
async function fetchGoogleBookByIsbn(isbn) {
    let googleError;
    try {
        const { response, data, text } = await fetchWithRetry(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apikey}`);
        if (!response.ok) {
            console.error('Google Books API response:', data);
            googleError = `Google Books API error\nStatus: ${response.status} ${response.statusText}\n${text || '(empty response body)'}`;
        } else if (data?.items?.length) {
            return data.items[0].volumeInfo;
        } else {
            console.warn('Google Books API returned no matches, trying Open Library:', data);
        }
    } catch (error) {
        console.error('Google Books API request failed:', error);
        googleError = `Google Books API request failed: ${error}`;
    }

    const openLibraryInfo = await fetchOpenLibraryBookByIsbn(isbn);
    if (openLibraryInfo) {
        console.warn('Google Books had no match for this ISBN, so the info came from Open Library instead.');
        return openLibraryInfo;
    }
    throw new Error(googleError ? `${googleError}\n\nOpen Library also had no match.` : 'No data returned for ISBN (checked Google Books and Open Library)');
}

async function fetchOpenLibraryBookByIsbn(isbn) {
    const key = `ISBN:${isbn}`;
    const { response, data } = await fetchWithRetry(`https://openlibrary.org/api/books?bibkeys=${key}&format=json&jscmd=data`);
    const book = response.ok ? data?.[key] : null;
    if (!book) { console.error('Open Library response:', data); return null; }
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
