import { CommandInteraction } from "discord.js"
import { Discord, Slash } from "discordx"

@Discord()
export class WaitThatsMe {
  @Slash({ name: "wait-thats-me", description: "Send Me?" })
  async waitThatsMe(interaction: CommandInteraction): Promise<void> {
    await interaction.deferReply()
    await interaction.followUp("https://tenor.com/view/cat-meme-pee-cat-pee-funny-lmfao-gif-14727908981812019274")
  }
}
