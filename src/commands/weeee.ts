import { type CommandInteraction } from "discord.js"
import { Discord, Slash } from "discordx"
import { getGif } from "../utils/getGif.js"
import { tryCatch } from "../utils/tryCatch.js"

@Discord()
export class Weeee {
  @Slash({ description: "WEEEEEEEEEEEEEEEEEE", name: "weeee" })
  async weeee(interaction: CommandInteraction): Promise<void> {
    await interaction.deferReply()
    
    // Fetch a "fast cat" or "zoomies" gif
    const result = await tryCatch(getGif("fast cat", "cat zoomies", "speedy cat"))
    
    if (result.error) {
      await interaction.followUp(result.error.message)
      return
    }

    await interaction.followUp({
      files: [{ attachment: result.data, name: "weeee.gif" }],
      content: "WEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE! 🎢"
    })
  }
}