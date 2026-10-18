
import Tesseract from 'tesseract.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Re-using the known working image to ensure no regressions in basic OCR
const imagePath = path.join(__dirname, 'src/assets/community/tech-fest.png');

console.log(`Testing OCR Regression on: ${imagePath}`);

async function run() {
    try {
        const worker = await Tesseract.createWorker('eng');
        const ret = await worker.recognize(imagePath);
        console.log('--- OCR Result ---');
        console.log(ret.data.text);
        console.log('--- End Result ---');
        await worker.terminate();
    } catch (err) {
        console.error('OCR Failed:', err);
    }
}

run();
