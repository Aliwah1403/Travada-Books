import { createClient } from "redis"

const buildClient = (url: string) =>
  createClient({
    url,
    socket: {
      // Back off up to 5s between reconnect attempts instead of hammering Upstash.
      reconnectStrategy: (retries) => Math.min(retries * 200, 5_000),
    },
  })

export type Redis = ReturnType<typeof buildClient>

export async function connectRedis(url: string): Promise<Redis> {
  const client = buildClient(url)
  // Without an error listener node-redis throws on connection errors and
  // crashes the process; log them and let the reconnect strategy recover.
  client.on("error", (error: Error) => console.error("[redis]", error.message))
  await client.connect()
  return client
}
