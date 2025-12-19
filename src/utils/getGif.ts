import { env } from "../env.js"
import { tryCatch } from "./tryCatch.js"

type TenorGifsResult = {
  results: {
    media_formats: {
      gif: {
        url: string
      }
    }
  }[]
}

/** 
 * Get a random gif from Tenor API
 * @param query - The queries to search for
 * @returns The url of the gif
 */
export async function getGif(...query: string[]): Promise<string> {
  const randomQuery = query[Math.floor(Math.random() * query.length)];
  const api = `https://tenor.googleapis.com/v2/search?q=${randomQuery}&key=${env.TENOR_API_KEY}&random=true`;
  const result = await tryCatch(fetch(api).then((r) => r.json() as Promise<TenorGifsResult>)); 
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data.results[0].media_formats.gif.url;
}