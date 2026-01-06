import { ConsoleTransport, LogLayer } from "loglayer"

/**
 * Custom logger for the discord bot.
 */
const logger = new LogLayer({
  prefix: "GlovedCat >>",
  transport: new ConsoleTransport({
    logger: console,
  }),
})

export default logger
