import { removeBackground } from '@imgly/background-removal-node';

async function test() {
  try {
    const heroNoBgBlob = await removeBackground("https://picsum.photos/200/300", {
      publicPath: "https://unpkg.com/@imgly/background-removal-node@1.4.5/dist/"
    });
    console.log("Success! size:", heroNoBgBlob.size);
  } catch(e) {
    console.log("Error:", e);
  }
}
test();
