const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const path = require('path');
const xlsx = require('xlsx');

const aadhaarDb = require('../config/aadhaarDb');

// DEMO-ONLY: Append a record (aadhaar,email) to the Excel sheet and reload cache.
// WARNING: Do NOT expose this in production without proper authentication/authorization.
// Use the writable Excel path (in serverless, /tmp). Falls back to bundled file in dev.
const getExcelPath = aadhaarDb.getExcelPath;

function normalizeAadhaar(v) {
  return String(v || '').replace(/\D/g, '');
}

function normalizeEmail(v) {
  return String(v || '').trim().toLowerCase();
}

router.post('/add', [
  body('aadhaarNumber')
    .isLength({ min: 12, max: 12 })
    .withMessage('Aadhaar number must be 12 digits')
    .matches(/^\d{12}$/)
    .withMessage('Aadhaar must be numeric'),
  body('email').isEmail().withMessage('Valid email required'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const aadhaarNumber = normalizeAadhaar(req.body.aadhaarNumber);
  const email = normalizeEmail(req.body.email);

  try {
    // Load workbook
    const excelPath = getExcelPath();
    const wb = xlsx.readFile(excelPath);
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });

    // Simple duplicate check
    const exists = rows.some((r) => {
      const possibleAadhar = r.aadhaarNumber || r.aadharNumber || r.aadhaar || r.aadhar || r.AADHAAR || r.AADHAR || r.Aadhaar || r.Aadhar || r.AadhaarNumber || r.AadharNumber;
      const possibleEmail = r.email || r.Email || r.eMail || r.EMail;
      return normalizeAadhaar(possibleAadhar) === aadhaarNumber || normalizeEmail(possibleEmail) === email;
    });

    if (exists) {
      return res.status(409).json({ success: false, message: 'Aadhaar or email already exists in the sheet.' });
    }

    // Determine standard headers; if empty, create headers
    let data = rows;
    if (data.length === 0) {
      data = [{ aadharNumber: aadhaarNumber, email: email }];
    } else {
      data.push({ aadharNumber: aadhaarNumber, email: email });
    }

    const newWs = xlsx.utils.json_to_sheet(data, { skipHeader: false });
    wb.Sheets[sheetName] = newWs;

    xlsx.writeFile(wb, excelPath);

    // Reload in-memory cache
    aadhaarDb.reload();

    return res.json({ success: true, message: 'Record added to Excel and cache reloaded.' });
  } catch (err) {
    console.error('[aadhaarAdmin] add error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update Excel.' });
  }
});

module.exports = router;
