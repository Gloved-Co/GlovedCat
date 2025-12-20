import {
  DMChannel,
  NewsChannel,
  PartialDMChannel,
  PartialGroupDMChannel,
  PrivateThreadChannel,
  PublicThreadChannel,
  StageChannel,
  TextChannel,
  VoiceChannel,
} from "discord.js"

export async function sendTyping(
  channel:
    | DMChannel
    | PartialDMChannel
    | PartialGroupDMChannel
    | NewsChannel
    | StageChannel
    | TextChannel
    | PublicThreadChannel
    | PrivateThreadChannel
    | VoiceChannel,
) {
  if ("sendTyping" in channel) return await channel.sendTyping()
}
