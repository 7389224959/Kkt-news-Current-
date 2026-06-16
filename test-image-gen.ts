import { generateAiImage } from "./services/geminiService.js";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  try {
    console.log("Generating image...");
    const url = await generateAiImage("A busy road in India");
    console.log("Success:", url);
  } catch (error) {
    console.error("Failed to generate image:", error);
  }
}

run();
