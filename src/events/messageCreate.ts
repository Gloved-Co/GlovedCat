import { Discord, On, type ArgsOf, type Client } from "discordx";
import { tryCatch } from "../utils/tryCatch";
import { getGif } from "../utils/getGif";

@Discord()
export class MessageCreate {
  @On()
  async messageCreate([message]: ArgsOf<"messageCreate">, client: Client): Promise<void> {
    if (message.author.bot) {
      return;
    }
    const gifChance = Math.random() * 100;
    if (gifChance < 2) {
      const result = await tryCatch(getGif(["cat", "kitty", "kitten", "funny cat"]));
        if (result.error) {
          await message.reply(result.error.message);
          return;
        }
        await message.reply({ files: [{ attachment: result.data, name: "cat.gif" }] });
      };
    }
}
