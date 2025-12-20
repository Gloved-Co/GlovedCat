import "dotenv/config"
import { z } from "zod"

/**
 * Wraps the process.env with schema type validation.
 */
export const env = z
  .object({
    BOT_TOKEN: z.string(),
    TENOR_API_KEY: z.string(),
    GEMINI_KEY: z.string(),
  })
  .parse(process.env)
