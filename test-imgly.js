import { removeBackground } from '@imgly/background-removal-node';
import sharp from 'sharp';

async function run() {
    try {
        const url = "https://picsum.photos/400/400";
        console.log("Fetching");
        const res = await fetch(url, { redirect: "follow" });
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const jpegBuffer = await sharp(buffer).jpeg().toBuffer();
        const heroBlob = new Blob([new Uint8Array(jpegBuffer)], { type: 'image/jpeg' });
        
        console.log("Removing background...");
        const result = await removeBackground(heroBlob, {
            publicPath: "https://unpkg.com/@imgly/background-removal-node@1.4.5/dist/"
        });
        console.log("Success!", result.size);
    } catch (e) {
        console.error("Error:", e);
    }
}
run();
