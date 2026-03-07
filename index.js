import {readFile, writeFile} from "node:fs/promises";
import convert from "heic-convert";

async function convertHeic(fileLoc){
  const inputBuffer = await readFile(fileLoc);
  const outputBuffer = await convert({
    buffer: inputBuffer, // the HEIC file buffer
    format: 'PNG'        // output format
  });

  await writeFile('./result.png', outputBuffer);
  console.log("Written File");
}

convertHeic("./input.HEIC");
