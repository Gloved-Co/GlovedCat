import { Discord, On, type ArgsOf, type Client } from "discordx"
import { getGif } from "../utils/getGif.js"
import { tryCatch } from "../utils/tryCatch.js"

@Discord()
export class MessageCreate {
  @On()
  async messageCreate([message]: ArgsOf<"messageCreate">, client: Client): Promise<void> {
    void client.executeCommand(message)
    if (message.author.bot) {
      return
    }
    const gifChance = Math.random() * 100
    if (gifChance < 2) {
      const result = await tryCatch(getGif("cat", "kitty", "kitten", "funny cat"))
      if (result.error) {
        await message.reply(result.error.message)
        return
      }
      await message.reply({
        files: [{ attachment: result.data, name: "cat.gif" }],
      })
    }
  }
}
