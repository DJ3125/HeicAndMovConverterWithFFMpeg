import {readFile, writeFile, mkdir} from "node:fs/promises";
import {resolve} from "path";
import convert from "heic-convert";

export async function convertHeic({fileObj, date}){
  const directoryPath = resolve("out", `y${date.getFullYear()}`, `m${date.getMonth().toString().padStart(2, "0")}`, `d${date.getDate().toString().padStart(2, "0")}`);
  const createDirectory = await mkdir(directoryPath, {recursive: true});
  const inputBuffer = readFile(resolve(fileObj.parentPath, fileObj.name));
  const outputBuffer = await convert({
    buffer: await inputBuffer, // the HEIC file buffer
    format: 'PNG'        // output format
  });
  await createDirectory;
  await writeFile(resolve(directoryPath, fileObj.name.slice(0, ".heic".length * -1).concat(".png")), outputBuffer);
}