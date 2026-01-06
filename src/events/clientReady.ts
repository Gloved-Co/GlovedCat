import { ActivityType } from "discord.js"
import { Client, Discord, On, type ArgsOf } from "discordx"
import logger from "../utils/logger.js"

@Discord()
export class ClientReady {
  @On()
  async clientReady(_: ArgsOf<"clientReady">, client: Client): Promise<void> {
    // Make sure all guilds are cached
    await client.guilds.fetch()

    // Synchronize applications commands with Discord
    await client.initApplicationCommands()

    // To clear all guild commands, uncomment this line,
    // This is useful when moving from guild commands to global commands
    // It must only be executed once
    //
    //  await client.clearApplicationCommands(
    //    ...client.guilds.cache.map((g) => g.id)
    //  );

    logger.info(`${client.user?.displayName} started`)

    // set presence
    if (client.user) {
      const presence = client.user.setPresence({
        status: "online",
        activities: [
          {
            name: "Catnip",
            state: "Searching for the catnip",
            type: ActivityType.Custom,
          },
        ],
      })
      logger.info(`Set ${client.user?.displayName} presence to ${presence.activities.map((a) => a.name)}`)
    }
  }
}
