import { Discord, On, type ArgsOf, type Client } from "discordx"

@Discord()
export class InteractionCreate {
  @On()
  interactionCreate([interaction]: ArgsOf<"interactionCreate">, client: Client): void {
    void client.executeInteraction(interaction)
  }
}
