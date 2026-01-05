import { ConsoleTransport, LogLayer } from "loglayer"

/**
 * Logger for the discord bot.
 */
const clientLogger = new LogLayer({
  prefix: "GlovedCat >> ",
  transport: new ConsoleTransport({
    logger: console,
  }),
})
export default clientLogger
