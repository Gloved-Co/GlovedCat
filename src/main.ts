import { dirname, importx } from "@discordx/importer"
import { IntentsBitField } from "discord.js"
import { Client } from "discordx"
import { env } from "./env.js"

export const bot = new Client({
  // To use only guild command
  // botGuilds: [(client) => client.guilds.cache.map((guild) => guild.id)],

  // Discord intents
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.MessageContent,
  ],

  // Debug logs are disabled in silent mode
  silent: false,

  // Configuration for @SimpleCommand
  simpleCommand: {
    prefix: "!",
  },
})

async function run() {
  // Import all events and commands
  await importx(`${dirname(import.meta.url)}/{events,commands}/**/*.{ts,js}`)

  // Log in with your bot token
  await bot.login(env.BOT_TOKEN)
}

void run()
