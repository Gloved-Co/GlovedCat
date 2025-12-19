import { tryCatch } from "./tryCatch"

type TenorGifsResult = {
  results: {
    media_formats: {
      gif: {
        url: string
      }
    }
  }[]
}
const tenorApiKey = process.env.TENOR_API_KEY;
if (!tenorApiKey) {
  throw new Error("TENOR_API_KEY is not set");
}

/** 
 * Get a random gif from Tenor API
 * @param query - The queries to search for
 * @returns The url of the gif
 */
export async function getGif(...query: string[]): Promise<string> {
  const randomQuery = query[Math.floor(Math.random() * query.length)];
  const api = `https://tenor.googleapis.com/v2/search?q=${randomQuery}&key=${tenorApiKey}&random=true`;
  const result = await tryCatch(fetch(api).then((r) => r.json() as Promise<TenorGifsResult>)); 
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data.results[0].media_formats.gif.url;
}