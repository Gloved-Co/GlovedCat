import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createGroq } from "@ai-sdk/groq"
import { LanguageModelV2 } from "@ai-sdk/provider"
import { ModelMessage, customProvider, generateText } from "ai"
import {
  ChannelType,
  Collection,
  EmbedType,
  Message,
  TextChannel,
  ThreadAutoArchiveDuration,
  ThreadChannel,
  User,
} from "discord.js"
import { Client } from "discordx"
import * as fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { env } from "../env.js"
import autoDelete from "./autoDelete.js"
import logger from "./logger.js"

const MessageIds: string[] = []

const Models = [
  {
    value: "gemini-flash-lite-latest",
    provider: "google",
  } as const,
  {
    value: "moonshotai/kimi-k2-instruct-0905",
    provider: "groq",
  } as const,
] as const

type ModelID = (typeof Models)[number]["value"]

/**
 * The current AI model being used.
 */
export let currentModel: ModelID = "moonshotai/kimi-k2-instruct-0905"

/**
 * The list of available models.
 *
 * @description If null, the models have not been fetched yet.
 */
export let modelList: string[] | null = null

/**
 * The path to the current directory.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_KEY })
const groq = createGroq({ apiKey: env.GROQ_KEY })

const languageModels = Models.reduce(
  (acc, { value, provider }) => {
    if (provider === "google") {
      acc[value] = google.languageModel(value)
    } else if (provider === "groq") {
      acc[value] = groq.languageModel(value)
    }
    return acc
  },
  {} as Record<ModelID, LanguageModelV2>,
)

const modelProvider = customProvider({
  languageModels,
})

/**
 * Checks if the given message is from a channel with the given name.
 *
 * Only works for channels of type {@link ChannelType.GuildText} and {@link ChannelType.PublicThread}.
 *
 * @param {Message} message - The message to check.
 * @param {string} channelName - The name of the channel to check against.
 * @returns {boolean} True if the channel matches, false otherwise.
 */
export function messageInNamedChannel(message: Message, channelName: string): boolean {
  if (message.channel.type === ChannelType.GuildText || message.channel.type === ChannelType.PublicThread) {
    return message.channel.name === channelName
  }
  return false
}

/**
 * The path to the directory where log files are stored.
 */
const logDir = path.join(__dirname, "../../logs") // Create a 'logs' directory

/**
 * The path to the log file for conversations.
 */
const convoLogFile = path.join(logDir, "conversations.log")

// Ensure the log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true }) // Create the directory if it doesn't exist
}

/**
 * Returns the system prompt.
 *
 * @returns the system prompt
 */
export function getSystemPrompt() {
  const systemPrompt = fs.readFileSync("system_prompt.txt", "utf8").trim()
  return systemPrompt
}

const generationConfig = {
  temperature: 1,
  maxOutputTokens: 8192 / 2,
  responseMimeType: "text/plain",
  frequencyPenalty: 0.5,
}

/**
 * The type of message content. Format required by the AI SDK.
 */
export type ChatMessage = {
  role: "user" | "assistant"
  content:
    | string
    | (
        | {
            type: "image"
            image: string
          }
        | {
            type: "text"
            text: string
          }
        | {
            type: "file"
            data: string
            mimeType: string
          }
      )[]
}

/**
 * The list of last messages sent in each channel.
 */
let lastMessages: { channel: TextChannel | ThreadChannel; message: Message }[] = []

/**
 * Toggles the permissions of the bot in a text channel.
 *
 * @param msg The message that triggered the command.
 * @param enabled Whether to enable or disable the permissions.
 * @returns A promise that resolves when the permissions have been toggled.
 */
async function editChannelPermissions(msg: Message, enabled: boolean): Promise<void> {
  const channel = msg.channel
  if (channel.type !== ChannelType.GuildText) return
  await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
    SendMessages: enabled,
  })
}

/**
 * Fetches the data of an attachment.
 *
 * @param url The URL of the attachment.
 * @returns A promise that resolves to the data of the attachment.
 */
async function fetchAttachmentData(url: string) {
  const attachmentData = await fetch(url).then((res) => res.arrayBuffer())
  return Buffer.from(attachmentData).toString("base64")
}

/**
 * Formats the message content.
 * @param content The content of the message.
 * @param images Optional attachments to be included in the message.
 * @returns The formatted message content.
 */
export function formatMessageContent(content: string, images?: string[], videos?: string[]) {
  if (!images && !videos) return content

  const contentArray: (
    | { type: "image"; image: string }
    | { type: "text"; text: string }
    | { type: "file"; data: string; mimeType: string }
  )[] = []
  if (images) {
    contentArray.push(
      ...images.map(
        (url) =>
          ({
            type: "image",
            image: url,
          }) as const,
      ),
    )
  }
  if (videos) {
    contentArray.push(
      ...videos.map(
        (url) =>
          ({
            type: "file",
            data: url,
            mimeType: "video/mp4",
          }) as const,
      ),
    )
  }
  if (content.trim()) {
    contentArray.push({ type: "text", text: content })
  }

  return contentArray
}

/**
 * Returns the attachments of a message.
 *
 * @param msg The message to get the attachments from.
 * @returns The attachments of the message, or null if there are no attachments.
 */
async function getAttachments(msg: Message): Promise<{ inlineData: { data: string; mimeType: string } } | null> {
  const attachment = msg.attachments.first()

  // Check for attachments
  if (attachment && (attachment.contentType?.startsWith("image") || attachment.contentType?.startsWith("video"))) {
    const url = attachment.url
    const mimeType = attachment.contentType
    const data = await fetchAttachmentData(url)

    return {
      inlineData: {
        data: data,
        mimeType: mimeType,
      },
    }
  }

  // Check for GIF link or video URL
  const containsGifLink = /https?:\/\/.*\.gif/.test(msg.content)
  logger.info(`message ${msg.id} content contains gif ${containsGifLink}`)
  const videoUrl = msg.embeds[0].video?.url

  if (containsGifLink || videoUrl) {
    const url = containsGifLink ? msg.content.match(/https?:\/\/.*\.gif/)?.[0] : videoUrl
    const mimeType = videoUrl ? "video/mp4" : "image/gif"
    if (!url) return null

    const data = await fetchAttachmentData(url)

    return {
      inlineData: {
        data: data,
        mimeType: mimeType,
      },
    }
  }

  return null
}

/**
 * Returns the content of a message.
 *
 * @param msg The message to get the content from.
 * @param replacer The function to use to replace the content.
 * @returns The content of the message.
 */
function getMessageContent(msg: Message<boolean>, replacer: (text: string) => string = (text) => text): ChatMessage {
  const client = msg.client

  const attachments = msg.attachments.map((attachment) => attachment)
  const embeds = msg.embeds.map((embed) => embed)

  const videoEmbeds = embeds.filter((embed) => embed.toJSON().type === EmbedType.Video).map((embed) => embed.toJSON().url)
  const imageEmbeds = embeds.filter((embed) => embed.toJSON().type === EmbedType.Image).map((embed) => embed.toJSON().url)
  const images = [
    ...attachments.filter((attachment) => attachment.contentType?.startsWith("image")).map((attachment) => attachment.url),
    ...imageEmbeds,
  ].filter((url) => url !== undefined) as string[]
  const videos = [
    ...attachments.filter((attachment) => attachment.contentType?.startsWith("video")).map((attachment) => attachment.url),
    ...videoEmbeds,
  ].filter((url) => url !== undefined) as string[]

  const text =
    msg.author.id === client.user.id ?
      replacer(msg.content)
    : `${msg.author.username} (${msg.author.id}): ${replacer(msg.content)}`

  const content = formatMessageContent(text, images, videos)

  return {
    role: msg.author.id === client.user.id ? "assistant" : "user",
    content,
  }
}

var sentMessage: Message | null = null

/**
 * Type definition for AI generation parameters.
 *
 * @property client - The manager client instance.
 * @property message - The message to process.
 * @property checkLastMessage - Optional flag to check if the last message is the same as the current message.
 * @property createThread - Optional flag to determine if a thread should be created for the response.
 * @property fetchLimit - Optional limit for the number of messages to fetch.
 * @property streaming - Optional flag to determine if the response should be streamed.
 */
type aiGenerateType = {
  client: Client
  message: Message
  checkLastMessage?: boolean
  createThread?: boolean
  fetchLimit?: number
}

/**
 * Function to generate a response from the AI.
 *
 * @param client The client instance.
 * @param message The message to generate a response from.
 * @param checkLastMessage Whether to check if the last message is the same as the current message.
 * @param createThread Whether to create a thread for the response.
 * @param fetchLimit The maximum number of messages to fetch.
 */
export async function aiGenerate({
  client,
  message,
  checkLastMessage = true,
  createThread = false,
  fetchLimit = 25,
}: aiGenerateType) {
  // Make sure the message is in a guild
  if (!message.guild) {
    await message.reply("AI Generation function can only run in a server. How did this happen?").then(autoDelete)
    return
  }
  const guild = message.guild

  // Just to make sure no dupe messages are generated
  if (MessageIds.includes(message.id)) return
  MessageIds.push(message.id)

  let responseChannel = message.channel
  if (createThread && message.channel.type == ChannelType.GuildText && !responseChannel.isThread()) {
    const threadName = `${message.author.username}-${message.createdTimestamp.toString()}`
    responseChannel = await message.channel.threads.create({
      startMessage: message,
      name: threadName,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
      reason: `Thread started by ${message.author.username}`,
      type: ChannelType.PrivateThread,
    })
    if (checkLastMessage) {
      lastMessages.push({ channel: responseChannel, message })
    }
  } else {
    if (checkLastMessage) {
      lastMessages.push({
        channel: responseChannel as TextChannel,
        message: (await message.channel.messages.fetch({ limit: 1 })).first() as Message<boolean>,
      })
    }
  }

  // Ensure we have a text-based channel
  if (!responseChannel.isTextBased()) {
    throw new Error("Channel must be a text-based channel (text channel or thread)")
  }

  // TypeScript will now know this is a text-based channel
  const channel = responseChannel

  await editChannelPermissions(message, false)

  async function notLastMessageCheck(message: Message) {
    if (!checkLastMessage) {
      logger.info(`Last message check disabled`)
      return false
    }
    logger.info(`Checking last message...`)

    const lastMessage = await message.channel.messages.fetch({ limit: 1, after: message.id }).then((msg) => msg.first())
    if (!lastMessage) {
      logger.info(`Last message not found`)
      return false
    }
    logger.info(`Last message: ${lastMessage.id}`)
    logger.info(`Current message: ${message.id}`)
    return lastMessage.id != message.id
  }

  logger.info(`Loading system prompt...`)
  const systemInstruction = getSystemPrompt()
  logger.info(`System prompt loaded: ${systemInstruction}`)

  const fetchedMessages: Collection<string, Message<boolean>> = await channel.messages.fetch({
    limit: fetchLimit,
  })

  const orderedMessages: Collection<string, Message<boolean>> = fetchedMessages.filter(
    (msg) => msg.content.trim() !== "" && !msg.reactions.cache.findKey((r) => r.emoji.name === "❌"),
  )

  const filteredMessages = new Collection<string, Message<boolean>>()
  filteredMessages.set(message.id, message)
  orderedMessages.forEach((msg) => {
    filteredMessages.set(msg.id, msg)
  })

  logger.info(`Fetched ${orderedMessages.size} messages`)

  const mentionRegex = /<@!?(\d+)>|<@&(\d+)>|<@(\d+)>/g
  const userIds = new Set<string>()

  filteredMessages.forEach((msg) => {
    const mentions = msg.content.match(mentionRegex)
    if (mentions) {
      mentions.forEach((mention) => {
        const userId = mention.replace(/[<@!&>]/g, "") // Extract the numeric ID
        userIds.add(userId)
      })
    }
  })

  const users: User[] = await Promise.all(
    Array.from(userIds).map(async (userId) => (await guild.members.fetch(userId)).user),
  )
  const userMap: Map<string, string> = new Map(users.map((user) => [user.id, user.username]))

  /**
   * Replace mentions in a message with a format that GenAI can understand.
   *
   * Replaces `<@!{userId}>` and `<@{userId}>` with `@{username}`.
   * If the user is not found in the user map, the original mention is kept.
   *
   * @param content The message content to replace mentions in.
   * @returns The modified content with mentions replaced.
   */
  function msgReplaceRegex(content: string) {
    return content.replace(mentionRegex, (match) => {
      const userId = match.replace(/[<@!&>]/g, "") // Extract the numeric ID
      const username = userMap.get(userId) || match // Replace with username or keep original mention
      return `@${username}`
    })
  }

  const conversations: ChatMessage[] = filteredMessages.map((msg) => getMessageContent(msg, msgReplaceRegex)).reverse()

  if (conversations.length > 1 && conversations.length < fetchLimit && responseChannel.isThread()) {
    const msg = await responseChannel.fetchStarterMessage()
    if (msg) {
      conversations.unshift({
        role: "user",
        content: `${message.author.username}: ${msgReplaceRegex(msg.content)}`,
      })
    }
  }

  conversations.pop()

  try {
    const model = modelProvider.languageModel(currentModel)

    logger.info(`Starting chat with conversation: ${JSON.stringify(conversations, null, 1)}`)

    const userAiMessage = `${message.author.username}: ${msgReplaceRegex(message.content)}`

    conversations.push({
      role: "user",
      content: userAiMessage,
    })

    if (await notLastMessageCheck(message)) {
      return
    }

    const result = await generateText({
      model,
      maxRetries: 0,
      maxOutputTokens: generationConfig.maxOutputTokens,
      temperature: generationConfig.temperature,
      system: systemInstruction,
      messages: conversations as ModelMessage[],
    })

    // clientLogger.info(JSON.stringify(result, null, 4));

    function formatUsernames(aiResponse: string) {
      // Match all @username patterns
      const matches = aiResponse.match(/@(\w+)/g)

      if (matches) {
        for (const match of matches) {
          const username = match.slice(1) // Remove the '@'
          const user = client.users.cache.find((user) => user.username === username) // Fetch user by username

          if (user) {
            // Replace the @username with <@user_id>
            aiResponse = aiResponse.replace(match, `<@${user.id}>`)
          }
        }
      }

      return aiResponse
    }
    const chatText = result.text

    const aiResponse = formatUsernames(chatText)

    logger.info(`Generated Response: ${aiResponse}`)

    // logMessage(`${client.user?.username}: ${aiResponse}`)
    const maxChunkSize = 2000
    if (aiResponse.length > maxChunkSize) {
      const chunks = aiResponse.match(new RegExp(".{1," + maxChunkSize + "}", "g"))
      if (chunks) {
        if (await notLastMessageCheck(message)) {
          return
        }
        for (const chunk of chunks) {
          if (await notLastMessageCheck(message)) {
            return
          }
          if (channel.type == ChannelType.GuildText) {
            await channel.send(chunk)
          } else if (channel.type == ChannelType.PublicThread) {
            await channel.send(chunk)
          }
        }
      }
    } else {
      if (await notLastMessageCheck(message)) {
        return
      }
      if (channel.type == ChannelType.GuildText) {
        sentMessage = await channel.send(aiResponse)
      } else if (channel.type == ChannelType.PublicThread) {
        sentMessage = await channel.send(aiResponse)
      }
    }

    logger.info(`Current conversation: ${JSON.stringify(conversations, null, 1)}`)
  } catch (error) {
    logger.error(`Error in chat: ${error}`)
    if (sentMessage?.deletable) await sentMessage.delete()
    await message
      .reply("Sorry, I couldn't process your request. Here's what went wrong: ```\n" + error + "\n```")
      .then(autoDelete)
    await autoDelete(message)
  } finally {
    await editChannelPermissions(message, true)
  }
}
