// Starts the bot: reads its settings from the environment, opens its
// encrypted store, links it to Peachy on the first run, and listens.
import { Bot, PeachyBotError } from "@peachysocial/bot";
import { register } from "./bot.ts";

const env = process.env;

if (!env.PEACHY_BOT_STORE_KEY && !env.PEACHY_BOT_STORE_KEY_FILE) {
  console.error("No store key. Make one with: npx @peachysocial/bot keygen --out .peachy-store-key, then set PEACHY_BOT_STORE_KEY_FILE=.peachy-store-key in .env");
  process.exit(1);
}

const bot = new Bot({
  // Postgres when the host gives you a database (Render sets DATABASE_URL),
  // otherwise one SQLite file. Either way every value is encrypted with the
  // store key before it is written.
  store: env.DATABASE_URL ? Bot.postgres(env.DATABASE_URL) : Bot.sqlite(env.PEACHY_BOT_DB || "./data/bot.db"),
  // From `npx @peachysocial/bot keygen --out <file>`: a 0600 file on your computer,
  // your host's secrets in production, never in the store or next to it.
  storeKey: env.PEACHY_BOT_STORE_KEY_FILE ? Bot.keyFile(env.PEACHY_BOT_STORE_KEY_FILE) : env.PEACHY_BOT_STORE_KEY!,
  // Link with `npx @peachysocial/bot connect`, which asks for the Connect code. On a
  // host where you can't type, set PEACHY_CONNECT_CODE once instead: it is
  // used only while the store holds no bot; remove it after.
  connectCode: env.PEACHY_CONNECT_CODE || undefined,
  // Never write message text to the logs.
  logContent: false,
});

register(bot, {
  allow: (env.PEACHY_BOT_ALLOW ?? "").split(",").map((h) => h.trim()).filter(Boolean),
  // An id, never words: what to put in PEACHY_BOT_ALLOW to pin this person.
  onResolved: (handle, actorId) => console.log(JSON.stringify({ event: "allow.resolved", handle, actorId })),
});

bot.on("status", (s) => {
  if (s.kind === "connected" && s.firstTime) console.log(`Linked ✓ as @${s.profile.handle}`);
});

// A bot that stopped on its own (another copy took over, its keys were reset)
// receives nothing more: exit non-zero, so your host restarts it or tells you.
bot.on("error", (err, { fatal }) => {
  console.error(err instanceof PeachyBotError ? err.message : err);
  if (fatal) process.exit(1);
});

try {
  const me = await bot.start();
  console.log(`@${me.handle} is running. Send it a message to try it.`);
} catch (err) {
  // The SDK's errors say what to do next (a used Connect code, a wrong store key…).
  console.error(err instanceof PeachyBotError ? err.message : err);
  process.exit(1);
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void bot.stop().finally(() => process.exit(0));
  });
}
