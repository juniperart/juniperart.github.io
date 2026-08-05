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

async function fetchGoogleBookByIsbn(isbn) {
    const { response, data, text } = await fetchWithRetry(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apikey}`);
    if (!response.ok) {
        console.error('Google Books API response:', data);
        throw new Error(`Google Books API error\nStatus: ${response.status} ${response.statusText}\n${text || '(empty response body)'}`);
    }
    if (!data?.items?.length) { console.error('Google Books API response:', data); throw new Error('No data returned for ISBN'); }
    return data.items[0].volumeInfo;
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
