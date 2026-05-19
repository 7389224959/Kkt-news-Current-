import { getWikipediaImage } from './services/wikipediaService';

async function run() {
    const img = await getWikipediaImage("Narendra Modi");
    console.log("Wiki Image:", img);
    if (!img) return;

    try {
        const res = await fetch(img, {
            headers: {
                'User-Agent': 'KKTNewsBot/1.0 (vishal9425545374@gmail.com)'
            }
        });
        console.log("Fetch Status:", res.status);
    } catch(e) {
        console.log(e);
    }
}
run();
