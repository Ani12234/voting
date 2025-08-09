const path = require('path');
const xlsx = require('xlsx');
const fs = require('fs');

// Load Excel once at startup and build fast lookup maps
// Excel file expected at: server/config/random_emails_aadhaar_1000.xlsx
const BUNDLED_EXCEL_PATH = path.join(__dirname, 'random_emails_aadhaar_1000.xlsx');
const TMP_EXCEL_PATH = path.join('/tmp', 'random_emails_aadhaar_1000.xlsx');

// In serverless (Vercel), filesystem is read-only except /tmp. Ensure a writable copy exists.
function getExcelPath() {
  const inServerless = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
  if (!inServerless) {
    return BUNDLED_EXCEL_PATH;
  }
  try {
    // If a /tmp copy exists use it; else seed it from bundled asset (if present).
    if (!fs.existsSync(TMP_EXCEL_PATH)) {
      if (fs.existsSync(BUNDLED_EXCEL_PATH)) {
        fs.copyFileSync(BUNDLED_EXCEL_PATH, TMP_EXCEL_PATH);
      } else {
        // Ensure directory exists and create an empty workbook if source missing
        try { fs.mkdirSync(path.dirname(TMP_EXCEL_PATH), { recursive: true }); } catch {}
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet([]);
        xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
        xlsx.writeFile(wb, TMP_EXCEL_PATH);
      }
    }
  } catch (e) {
    console.error('[AADHAAR-DB] Error preparing writable Excel path:', e.message);
  }
  return TMP_EXCEL_PATH;
}

let aadharToEmail = new Map();
let emailToAadhar = new Map();

function normalizeAadhaar(value) {
  return String(value || '').replace(/\D/g, ''); // keep digits only
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function loadExcel() {
  try {
    const excelPath = getExcelPath();
    const wb = xlsx.readFile(excelPath);
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });

    aadharToEmail = new Map();
    emailToAadhar = new Map();

    for (const row of rows) {
      // Try to find likely column names
      const possibleAadhar = row.aadhaarNumber || row.aadharNumber || row.aadhaar || row.aadhar || row.AADHAAR || row.AADHAR || row.Aadhaar || row.Aadhar || row.AadhaarNumber || row.AadharNumber;
      const possibleEmail = row.email || row.Email || row.eMail || row.EMail;

      const aadhaar = normalizeAadhaar(possibleAadhar);
      const email = normalizeEmail(possibleEmail);

      if (aadhaar && email) {
        aadharToEmail.set(aadhaar, email);
        emailToAadhar.set(email, aadhaar);
      }
    }

    console.log(`[AADHAAR-DB] Loaded ${aadharToEmail.size} records from Excel.`);
  } catch (err) {
    console.error('[AADHAAR-DB] Failed to load Excel:', err.message);
  }
}

function getEmailByAadhaar(aadhaarNumber) {
  return aadharToEmail.get(normalizeAadhaar(aadhaarNumber));
}

function isValidPair(aadhaarNumber, email) {
  const e = getEmailByAadhaar(aadhaarNumber);
  return e && e === normalizeEmail(email);
}

function getAadhaarByEmail(email) {
  return emailToAadhar.get(normalizeEmail(email));
}

// Initial load
loadExcel();

module.exports = {
  getEmailByAadhaar,
  getAadhaarByEmail,
  isValidPair,
  reload: loadExcel,
  getExcelPath,
};
