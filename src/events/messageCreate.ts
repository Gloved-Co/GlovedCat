import { Message } from "discord.js"
import { Discord, On, type ArgsOf, type Client } from "discordx"
import { aiGenerate } from "../utils/ai.js"
import { getGif } from "../utils/getGif.js"
import { sendTyping } from "../utils/sendTyping.js"
import { tryCatch } from "../utils/tryCatch.js"

@Discord()
export class MessageCreate {
  @On()
  async messageCreate([message]: ArgsOf<"messageCreate">, client: Client): Promise<void> {
    void client.executeCommand(message)
    if (message.author.bot) {
      return
    }
    /**  AI Cat Logic Start  */
    // TODO: Add AI Cat Logic

    let messageReference: Message | undefined
    if (message.reference?.messageId) {
      messageReference = message.channel.messages.cache.get(message.reference.messageId)
    }
    const isMentioned = message.mentions.users.has(message.client.user.id) && !message.mentions.everyone
    if (isMentioned || messageReference?.author.id === message.client.user.id) {
      await sendTyping(message.channel)
      await aiGenerate({
        message,
        client,
        fetchLimit: 10,
      })
    }
    /**  AI Cat Logic End  */

    // Cat Gif Logic
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
