// The whole bot against @peachysocial/bot/testing, an in-memory Peachy: the SDK's
// own routing decides which handler runs, as it does in production.
import assert from "node:assert/strict";
import test from "node:test";
import { FakePeachy } from "@peachysocial/bot/testing";
import { register } from "../bot.ts";

async function start(allow: string[] = []) {
  const peachy = new FakePeachy({ handle: "yourbot" });
  const bot = register(peachy.bot(), { allow });
  await bot.start();
  return { peachy, bot, maya: peachy.person("Maya", "maya"), theo: peachy.person("Theo", "theo") };
}

/** The words of the bot's replies in a fake group, in order. */
const replies = (posts: readonly { kind: string; text?: string }[]) => posts.filter((p) => p.kind === "reply").map((p) => p.text);

test("/pick in a group replies with one of the choices, also sent to the chat", async () => {
  const { peachy, bot, maya } = await start();
  const chat = await peachy.addToChat({ by: maya, name: "Dinner", grants: ["post"] });
  await chat.say(maya, "@yourbot /pick pizza, tacos, sushi", { mentionsBot: true });
  const [reply] = chat.posts;
  assert.ok(reply && reply.kind === "reply");
  assert.match(reply.text, /^I pick (pizza|tacos|sushi)\.$/);
  assert.equal(reply.alsoSendToChat, true);
  await bot.stop();
});

test("/pick with one choice replies in the thread only", async () => {
  const { peachy, bot, maya } = await start();
  const chat = await peachy.addToChat({ by: maya, name: "Dinner", grants: ["post"] });
  const asked = await chat.say(maya, "/pick pizza");
  assert.deepEqual(
    chat.posts.map((p) => p.kind === "reply" && [p.text, p.replyTo, p.alsoSendToChat]),
    [["Give me two or more choices, separated by commas.", asked, false]],
  );
  await bot.stop();
});

test("anything else in the DM, or a mention in a group, gets the greeting; other group messages don't", async () => {
  const { peachy, bot, maya, theo } = await start();
  assert.deepEqual(await peachy.dm(theo, "hello"), {
    kind: "reply",
    text: "Hi Theo! Try /pick pizza, tacos, sushi.",
    alsoSendToChat: false,
    inline: true,
    typed: true,
  });
  const chat = await peachy.addToChat({ by: maya, members: [theo], name: "Dinner", grants: ["post"] });
  await chat.say(theo, "dinner at 8?");
  await chat.say(theo, "@yourbot hi", { mentionsBot: true });
  assert.deepEqual(replies(chat.posts), ["Hi Theo! Try /pick pizza, tacos, sushi."]);
  await bot.stop();
});

test("/help lists /pick", async () => {
  const { peachy, bot, maya } = await start();
  const help = await peachy.dm(maya, "/help");
  assert.equal(help.kind, "reply");
  assert.match(help.kind === "reply" ? help.text : "", /\/pick <this, that, …> · Pick one for the group/);
  await bot.stop();
});

test("/pick works in the bot's own DM, inline", async () => {
  const { peachy, bot, maya } = await start();
  const out = await peachy.dm(maya, "/pick tea, coffee");
  assert.equal(out.kind, "reply");
  assert.match(out.kind === "reply" ? out.text : "", /^I pick (tea|coffee)\.$/);
  assert.equal(out.kind === "reply" && out.inline, true);
  await bot.stop();
});

test("/pick with one choice in the bot's DM replies in the DM", async () => {
  const { peachy, bot, maya } = await start();
  const out = await peachy.dm(maya, "/pick tea");
  assert.equal(out.kind === "reply" ? out.text : out.kind, "Give me two or more choices, separated by commas.");
  await bot.stop();
});

test("someone outside the allow list gets nothing in the DM", async () => {
  const { peachy, bot, maya, theo } = await start(["@Maya"]);
  assert.equal((await peachy.dm(maya, "hello")).kind, "reply");
  assert.equal((await peachy.dm(theo, "hello")).kind, "none");
  await bot.stop();
});

test("a mention in a group the bot reads is replied to in its thread", async () => {
  const { peachy, bot, maya, theo } = await start();
  const errors: Error[] = [];
  bot.on("error", (e) => void errors.push(e));
  const chat = await peachy.addToChat({ by: maya, members: [maya, theo], name: "Dinner", grants: ["post"] });
  const asked = await chat.say(maya, "@yourbot /pick tacos", { mentionsBot: true });
  assert.deepEqual(errors, []);
  assert.ok(chat.posts.some((p) => p.kind === "reply" && p.replyTo === asked && p.text === "Give me two or more choices, separated by commas."));
  await bot.stop();
});

test("the allow list takes account ids, and a failed handle lookup isn't remembered", async () => {
  const id = "0b9f3c1e-8f7a-4c2d-9e1b-5a6d7c8e9f01";
  const pinned = { actorId: id, name: "Dee", handle: "dee" };
  const peachy = new FakePeachy({ handle: "yourbot" });
  const maya = peachy.person("Maya", "maya");
  const resolved: string[] = [];
  const bot = peachy.bot();
  let down = true;
  const findPerson = bot.findPerson.bind(bot);
  bot.findPerson = async (h: string) => {
    if (down) throw new Error("the network is down");
    return findPerson(h);
  };
  bot.on("error", () => undefined);
  register(bot, { allow: [id, "@maya"], onResolved: (h, actorId) => resolved.push(`${h}=${actorId}`) });
  await bot.start();
  assert.equal((await peachy.dm(pinned, "hello")).kind, "reply", "an id needs no lookup");
  assert.equal((await peachy.dm(maya, "hello")).kind, "none", "the lookup failed");
  down = false;
  assert.equal((await peachy.dm(maya, "hello")).kind, "reply", "and was tried again");
  assert.deepEqual(resolved, [`@maya=${maya.actorId}`]);
  await bot.stop();
});
