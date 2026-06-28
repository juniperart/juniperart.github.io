const apikey = 'AIzaSyA_arhU6mmyfFViFKbuSezjVoenUzxTpeE';
const SPREADSHEET_ID = '13FXyHziavv5lBiIBafV5TF4fnBcthYbHv8zst_pjddA';

async function fetchGoogleBookByIsbn(isbn) {
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apikey}`);
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) { console.error('Google Books API response:', data); throw new Error(data?.error?.message || `Google Books error ${response.status}`); }
    if (!data?.items?.length) { console.error('Google Books API response:', data); throw new Error('No data returned for ISBN'); }
    return data.items[0].volumeInfo;
}

async function fetchSheetRange(range) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${apikey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data?.error?.message || `Google Sheets error ${response.status}`);
    }
    return (data.values || []).slice(1);
}
