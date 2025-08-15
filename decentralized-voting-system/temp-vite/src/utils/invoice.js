import { ethers } from 'ethers';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function getInvoiceChallenge(voteId, token) {
  const res = await fetch(`${API}/api/invoice/${voteId}/challenge`, {
    method: 'GET',
    headers: {
      'x-auth-token': token,
    },
  });
  if (!res.ok) throw new Error(`Challenge failed: ${res.status}`);
  return res.json(); // { address, voteId, challenge }
}

export async function signChallenge(provider, challenge) {
  const signer = await provider.getSigner();
  // personal_sign expects hex or utf8; ethers handles verifyMessage same
  const signature = await signer.signMessage(challenge);
  const address = await signer.getAddress();
  return { signature, address };
}

export async function downloadEncryptedInvoice(voteId, address, signature, token) {
  const res = await fetch(`${API}/api/invoice/${voteId}/download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': token,
    },
    body: JSON.stringify({ address, signature }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Download failed: ${res.status} ${msg}`);
  }
  const data = await res.json(); // { password, filename, pdfBase64, notEncrypted? }
  return data;
}

export function saveBase64Pdf(filename, base64) {
  const blob = b64toBlob(base64, 'application/pdf');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'invoice.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function b64toBlob(b64Data, contentType = '', sliceSize = 512) {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: contentType });
}
