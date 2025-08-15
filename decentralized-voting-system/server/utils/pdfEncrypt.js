const { spawn } = require('child_process');
const crypto = require('crypto');

function randomOwnerPassword() {
  return crypto.randomBytes(24).toString('hex');
}

// Encrypt a PDF buffer using qpdf. Returns a Promise<Buffer>.
// Requires qpdf installed and available on PATH, or specify QPDF_PATH in env.
async function encryptPdfBuffer(pdfBuffer, userPassword, ownerPassword) {
  const qpdfPath = process.env.QPDF_PATH || 'qpdf';
  const owner = ownerPassword || randomOwnerPassword();

  return new Promise((resolve, reject) => {
    const args = ['--encrypt', userPassword, owner, '256', '--', '-', '-'];
    const child = spawn(qpdfPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    const chunks = [];
    const errChunks = [];

    child.stdout.on('data', (d) => chunks.push(d));
    child.stderr.on('data', (d) => errChunks.push(d));

    child.on('error', (err) => {
      reject(new Error(`qpdf spawn failed: ${err.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        const msg = Buffer.concat(errChunks).toString() || `qpdf exited with code ${code}`;
        reject(new Error(msg));
      }
    });

    child.stdin.write(pdfBuffer);
    child.stdin.end();
  });
}

module.exports = { encryptPdfBuffer };
