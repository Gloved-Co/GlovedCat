import { type CommandInteraction } from "discord.js";
import { Discord, Slash } from "discordx";
import { tryCatch } from "../utils/tryCatch";
import { getGif } from "../utils/getGif";

@Discord()
export class CatGif {
  @Slash({ description: "Get a cat gif", name: "cat-gif" })
  async catGif(
    interaction: CommandInteraction,
  ): Promise<void> {
    await interaction.deferReply();
    const result = await tryCatch(getGif("cat", "kitty", "kitten", "funny cat")); 
    if (result.error) {
      await interaction.followUp(result.error.message);
      return;
    }
    const gifUrl = result.data;
    await interaction.followUp({ files: [{ attachment: gifUrl, name: "cat.gif" }] });
  }
}