const apikey = 'AIzaSyA_arhU6mmyfFViFKbuSezjVoenUzxTpeE';
const SPREADSHEET_ID = '13FXyHziavv5lBiIBafV5TF4fnBcthYbHv8zst_pjddA';

async function fetchSheetRange(range) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${apikey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data?.error?.message || `Google Sheets error ${response.status}`);
    }
    return (data.values || []).slice(1);
}
