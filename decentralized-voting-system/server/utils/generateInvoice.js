const PDFDocument = require('pdfkit');

function generateInvoice(vote, poll, voter) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            resolve(Buffer.concat(buffers));
        });
        doc.on('error', reject);

        // Header
        doc.fontSize(20).text('Vote Invoice', { align: 'center' });
        doc.moveDown();

        // Invoice Details
        doc.fontSize(12);
        doc.text(`Invoice ID: ${vote._id}`);
        doc.text(`Date: ${new Date(vote.createdAt).toLocaleString()}`);
        doc.moveDown();

        // Voter Information
        doc.text('Voter Information:', { underline: true });
        doc.text(`Wallet Address: ${voter.walletAddress}`);
        if (voter.name) {
            doc.text(`Name: ${voter.name}`);
        }
        doc.moveDown();

        // Vote Details
        doc.text('Vote Details:', { underline: true });
        doc.text(`Poll: ${poll.title}`);
        doc.text(`Voted for: "${vote.optionText}"`);
        doc.moveDown(2);

        // Footer
        doc.fontSize(10).text('Thank you for participating in the vote.', { align: 'center' });

        doc.end();
    });
}

module.exports = generateInvoice;
