const path = require('path');
const xlsx = require('xlsx');

// Load Excel once at startup and build fast lookup maps
// Excel file expected at: server/config/random_emails_aadhaar_1000.xlsx
const EXCEL_PATH = path.join(__dirname, 'random_emails_aadhaar_1000.xlsx');

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
    const wb = xlsx.readFile(EXCEL_PATH);
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
};
