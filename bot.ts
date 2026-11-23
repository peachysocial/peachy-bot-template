// Your bot: what it replies and who may reach it. Edit this file.
// main.ts wires it to Peachy; you rarely need to touch that.
//
// Everything people send the bot arrives as one message, `m`: in its DM
// (`m.via === "dm"`), or in a group it was added to (`m.via === "chat"`,
// `m.mentioned` when they picked the bot). The bot replies the way a person
// does, and everyone in the chat sees it:
//   m.reply(text)                            in the message's thread in a group
//                                            (to a mention, always; to anything
//                                            else, with the group's `post`),
//                                            inline under it in the DM
//   m.reply(text, { alsoSendToChat: true })  in a group, also in the main chat
// While a handler runs for a message meant for the bot, people see it typing.
import type { Bot } from "@peachysocial/bot";

export interface Settings {
  /**
   * People allowed to reach the bot: account ids, or handles (with or
   * without the @). Prefer ids: a handle is looked up again after each start,
   * so one that changed hands would let its new holder in. `onResolved` tells
   * you each handle's id. Empty leaves it to the listing.
   */
  readonly allow?: readonly string[];
  /** Told the account id a handle in `allow` named, so you can list the id instead. */
  readonly onResolved?: (handle: string, actorId: string) => void;
}

export function register(bot: Bot, settings: Settings = {}): Bot {
  // Who may reach it. "Who can use it" in the bot's listing comes first;
  // this can only narrow it further, for the bot's DM and for who may add it
  // to a group. Nothing they write in the DM reaches the handlers below. In a
  // group the bot was added to, the messages of every member who added it
  // or said OK to it arrive.
  const allow = (settings.allow ?? []).map((h) => h.trim()).filter(Boolean);
  if (allow.length > 0) allowOnly(bot, allow, settings.onResolved);

  // /pick pizza, tacos, sushi (or @yourbot /pick … in a group)
  bot.command("pick", { description: "Pick one for the group", blanks: "<this, that, …>", worksInDm: true }, (m) => {
    // A bare /pick in a group that doesn't let the bot post on its own: its reply wouldn't show.
    if (m.chat && !m.mentioned && !m.chat.grants.has("post")) return;
    const options = m.args.split(",").map((o) => o.trim()).filter(Boolean);
    // A nudge for the sender stays in the thread.
    if (options.length < 2) return m.reply("Give me two or more choices, separated by commas.");
    // The pick is for the whole group: send it to the chat too.
    return m.reply(`I pick ${options[Math.floor(Math.random() * options.length)]}.`, { alsoSendToChat: true });
  });

  // Anything else in the DM, or a mention in a group: a reply to a mention
  // always goes. (`/help` is replied for you, from the commands above.)
  // Other group messages arrive here too: this bot leaves them be.
  bot.on("message", (m) => {
    if (m.via === "dm" || m.mentioned) return m.reply(`Hi ${m.from.name}! Try /pick pizza, tacos, sushi.`);
  });

  return bot;
}

/** An account id, as Peachy shows it (`npx @peachysocial/bot dev` and the logs print them). */
const ACCOUNT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Narrow who may reach the bot to `entries`: account ids, or handles. An id
 * is fixed. A handle is looked up when the bot first needs it after a start,
 * and `onResolved` is told the account it named, so you can put that id in
 * the list instead: a handle can be given up and taken by someone else, and
 * the next start would look it up again. A lookup that fails is tried again
 * for the next person, not remembered.
 */
export function allowOnly(bot: Bot, entries: readonly string[], onResolved?: (handle: string, actorId: string) => void): void {
  const ids = new Set(entries.filter((e) => ACCOUNT_ID.test(e)).map((e) => e.toLowerCase()));
  const handles = entries.filter((e) => !ACCOUNT_ID.test(e));
  let resolved: Promise<Set<string>> | null = null;
  const resolve = async () => {
    const found = new Set<string>();
    for (const h of handles) {
      const p = await bot.findPerson(h);
      if (p) {
        found.add(p.actorId.toLowerCase());
        onResolved?.(h, p.actorId);
      }
    }
    return found;
  };
  bot.reach({
    also: async (person) => {
      const id = person.actorId.toLowerCase();
      if (ids.has(id)) return true;
      if (handles.length === 0) return false;
      resolved ??= resolve().catch((err: unknown) => {
        resolved = null;
        throw err;
      });
      return (await resolved).has(id);
    },
  });
}
