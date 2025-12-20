import { Client, Discord, On, type ArgsOf } from "discordx"

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

    console.log(`${client.user?.displayName} started`)
  }
}
