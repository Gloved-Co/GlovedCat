import { ConsoleTransport, LogLayer } from "loglayer"

/**
 * Logger for the discord bot.
 */
const customLogger = new LogLayer({
  prefix: "GlovedCat >>",
  transport: new ConsoleTransport({
    logger: console,
  }),
})

export default customLogger
