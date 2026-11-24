# Peachy bot template

A starting point for a bot on [Peachy](https://pchy.app), built on the
`@peachysocial/bot` SDK. Try it in your terminal in a few minutes, with no account;
then link it to a bot you create in Peachy, and it replies to its first
message.

Out of the box it does one thing: `/pick pizza, tacos, sushi` replies with
one of the choices, and in a group sends it to the chat too. Change `bot.ts`
to make it yours.

A bot on Peachy holds one end-to-end encrypted device, and is a member of
the chats it is in, as a person is: it reads what people write in its DM
and in the groups that add it. There is no phone number to register and no
captcha, and its state is encrypted on disk.

## Try it in your terminal

You need Node.js 22.13 or newer. No Peachy account yet.

```sh
git clone https://github.com/peachysocial/peachy-bot-template my-bot
cd my-bot
npm install
npx @peachysocial/bot dev
```

`dev` runs `bot.ts` against an in-memory Peachy, with no network and no
keys. Type a message and see the reply:

```
maya> /pick tea, coffee
maya> :add post
maya> :say @yourbot /pick pizza, tacos, sushi
maya> :help
```

A plain line writes in the bot's DM; `:add` adds it to a group, and `:say`
writes there. Edit `bot.ts` and run it again.

## Quickstart

You need Node.js 22.13 or newer and a Peachy account. Anyone can make a
development bot: only you and up to 10 testers can use it.

1. Get the code and install it, as above. `npm install` brings everything
   the bot needs, the packages its key transparency checks use and `werift`,
   which carries a call's audio and video, included.

2. Make the key the bot's store is encrypted with, in a file only you can
   read:

   ```sh
   npx @peachysocial/bot keygen --out .peachy-store-key
   cp .env.example .env
   ```

   `.env` points at it (`PEACHY_BOT_STORE_KEY_FILE=.peachy-store-key`). Both
   are in `.gitignore`; never commit them. Keep a copy of the key somewhere
   safe: without it the store can't be opened.

3. Create the bot in Peachy: **Settings › Organizations and bots › New bot**
   (on Mac, **You › Organizations and bots › New bot**; on the web,
   pchy.app/settings/organizations-and-bots). Leave
   **Who can use it** on **You and testers**, fill in its listing (see
   [Privacy labels checklist](#privacy-labels-checklist)), check **I agree
   to the [Developer Terms](https://pchy.app/developer-terms)**, and tap
   **Create**. You don't need to type its commands: the bot sends the ones
   in `bot.ts` when it starts. For an organization, the bot is one of its
   accounts (it holds 3, its first included, each reviewed by Peachy
   before it wears the Verified badge), and an admin can also turn an existing
   account into a bot with **Run as a bot**.

4. Tap **Connect** to get a one-time code, then link this copy of the bot:

   ```sh
   npx @peachysocial/bot connect
   ```

   Paste the code when it asks. It prints `Linked ✓ as @yourbot`, and the
   Connect screen in Peachy says **Connected**.

5. Start the bot:

   ```sh
   npm start
   ```

6. In any chat whose Bots setting allows it, type `@`, pick your bot from the
   **Bots** list, and send `/pick pizza, tacos, sushi`. A company's
   community takes only the bots its admins approve: your organization's
   own bot is approved in each of its communities that exist then, when an
   admin makes it or moves it in; in a community made later, or if that
   didn't land, an admin approves it under Bot approval › Approve a bot.

The full walkthrough is at https://pchy.app/developers/quickstart.

## Make it yours

- `bot.ts` is the bot: its commands, what it says to any other message, and
  who may reach it. `main.ts` reads the environment and starts it.
- A handler gets a message `m`: in your bot's DM (`m.via === "dm"`), or in a
  group that added it (`m.via === "chat"`, with `m.chat`). In a group the
  messages of every member who added it or said OK to it arrive (a
  member's first mention of it asks them first); `m.mentioned` is true when they picked your bot with `@`.
  Members whose community hasn't approved your bot send it nothing,
  mentions included; their community's admins approve it under Bot
  approval.
- Reply the way a person replies: `m.reply(text)` goes in the message's
  thread in a group (a reply to a mention always goes; any other needs the
  group's `post` grant) and inline under it in the DM. `m.reply(text, { alsoSendToChat: true })` also puts it in a
  group's main chat; that's your bot's call. Everyone in the chat sees a
  reply: there are no private ones.
- People see your bot typing while a handler runs for a message meant for
  it, until it replies. `typing: false` turns that off.
- `m.text` is their words exactly as sent. When they start with a command
  you registered (`/pick a, b`, or `@yourbot /pick a, b` in a group),
  `m.command` is its name and `m.args` is what follows it. In the DM a
  command runs only with `worksInDm`.
- `m.thread` is the one reply of your bot's that someone is replying to,
  if any. Keep what a conversation needs under `m.id`, and find it again by
  `m.thread[0].messageId`.
- `/help`, and an empty message in the DM, are replied for you, from the
  commands you register.
- Handlers may run again for the same message after a crash or a deploy
  (`m.redelivered`); a reply an earlier try sent isn't sent twice. Key
  anything you store by `m.id`.
- The commands you register in code are your listing's commands: the SDK
  sends them to Peachy when the bot starts, and the console shows them
  read-only. You don't type them in twice.
- Who may reach the bot is the listing's **Who can use it** (you and your
  testers, or anyone once published), and `PEACHY_BOT_ALLOW` can narrow it
  to certain people. In the DM the SDK ignores everyone else
  before your handlers run, and it leaves a group someone else added it to. If you narrow it in your own code, compare
  `person.actorId`, never the handle: handles change hands.
- `npm test` drives the bot against `@peachysocial/bot/testing`, an in-memory
  Peachy. No network, no keys.
- Every class and method is documented in its types: your editor shows it
  on hover.

| Setting | What it is |
|---|---|
| `PEACHY_BOT_STORE_KEY_FILE` | A file holding the store key, readable only by you (mode 600). How `.env` gives it on your computer. |
| `PEACHY_BOT_STORE_KEY` | The store key itself, from your host's secrets in production. A secret. |
| `PEACHY_BOT_ALLOW` | Optional. Who may reach the bot, comma-separated: account ids, or handles. Prefer ids: a handle is looked up again after every start, so one that changed hands would let its new holder in. The bot logs each handle's id (`allow.resolved`) to copy in. It narrows the listing's **Who can use it**, never widens it. Empty leaves it to the listing. |
| `PEACHY_BOT_DB` | Optional. The SQLite store's path (default `./data/bot.db`). |
| `DATABASE_URL` | Optional. Keep the store in Postgres instead of SQLite. |
| `PEACHY_CONNECT_CODE` | Optional. Links a bot whose store is empty, where you can't run `connect`. Remove it after. |

## Deploy

A bot is a long-running process: it keeps one connection open to Peachy and
needs no public URL, no open port and no webhook. Serverless platforms that
run code per request can't host it. A Fly.io machine, a Render background
worker, a Railway service, or one container on any VM all work.

Run exactly one copy of the bot. One store is one bot device, and the SDK
refuses to open a store another process holds, and Peachy refuses a copy of
the store running elsewhere: a new instance waits up to a minute for the old
one to stop (the bot stops on `SIGTERM`), then gives up. `main.ts` exits 1
when it gives up, and when a running bot stops on its own (another copy took
over, its keys were reset), so your host restarts it or tells you.

Running several of an organization's accounts? Each is its own bot, with
its own Connect code, store and store key. One process may run several
`Bot`s, each on its own store (see the SDK's README, "Several accounts");
two on one store fail at start. They share the organization's limits: a
refusal there is a `RateLimitedError` with `scope` `"owner"`.

To also take webhooks (a GitHub push posted to a group), run the SDK inside
your web server, still one instance and never scaled to zero: see
https://pchy.app/developers/quickstart#9-deploy.

**The store is the bot's identity.** It holds the bot's keys. If you lose
it, the way back is to reset the bot's keys (see
[Lost the store: Link a new server](#lost-the-store-link-a-new-server)). A second, empty store can't link a bot
that is still linked: it is refused, and the code it used signs the first
store out. So keep the bot you made in the
quickstart for development on your computer, and create a second bot for
production that you link only on the server.

The store key goes in your host's secret store. It is never in the image,
the repository, or next to the store. Postgres is the safer home for a
production store: a single machine's volume goes when the machine does.

On a server, link the bot with its Connect code as a secret for the first
start, rather than by running `connect` in a shell there. The bot links
itself when it starts with an empty store, and ignores the code after that.

### Fly.io

```sh
fly launch --no-deploy --copy-config
fly volumes create bot_data --size 1
npx @peachysocial/bot keygen   # a new store key for this server
fly secrets set PEACHY_BOT_STORE_KEY=… PEACHY_CONNECT_CODE=…
fly deploy
fly logs               # wait for "Linked ✓ as @yourbot"
fly secrets unset PEACHY_CONNECT_CODE
```

The Connect code is the production bot's, from its page in Peachy. The
store lives on the `bot_data` volume, encrypted. The container runs the bot
as an unprivileged user, and gives that user the state directory, mode
0700, and every file in it at each start. If you'd rather link from a
shell, run it as that user: `fly ssh console -u node -C "npx @peachysocial/bot
connect"`.

### Render

`render.yaml` is a Blueprint: a background worker and a Postgres database
reachable only from your Render services. In Render, choose **New ›
Blueprint** and pick your fork. When it asks for `PEACHY_BOT_STORE_KEY`,
paste a new key from `npx @peachysocial/bot keygen`, and for `PEACHY_CONNECT_CODE`
the production bot's Connect code. Once the worker's logs say `Linked ✓`,
delete `PEACHY_CONNECT_CODE`. Every value is encrypted under the store key
before it is written, so the database holds no readable key or message.

### Anywhere else

`Dockerfile` builds an image that keeps its state at `/data/bot.db`. Mount a
volume there, pass `PEACHY_BOT_STORE_KEY` and, for the first start,
`PEACHY_CONNECT_CODE` as secrets, and run one container. Remove the code
once the logs say `Linked ✓`. If you do run `npx @peachysocial/bot connect` inside
the container, run it as the `node` user (`docker exec -u node …`).

## Keys

| Key | Where it lives | If you lose it |
|---|---|---|
| The store key | Your host's secrets (`PEACHY_BOT_STORE_KEY`), or a 600 file (`PEACHY_BOT_STORE_KEY_FILE`), and a copy somewhere safe | The store can't be opened. Reset the bot's keys. |
| The bot's own keys | Inside the encrypted store | Reset the bot's keys. |
| The Connect code | Nowhere, once used | Nothing. Make a new one to link again. |

### Rotate the store key

Stop the bot, then, with the bot's current settings in the environment:

```sh
npx @peachysocial/bot rekey --out .peachy-store-key.new
```

It writes a new key to that file (mode 600; it must not exist yet), and
only then encrypts every value in the store again under it. Point
`PEACHY_BOT_STORE_KEY_FILE` at the new file, start the bot, and once it
runs, shred the old one (`shred -u .peachy-store-key`, or `rm -P` on a Mac).

If your key lives in your host's secrets (`PEACHY_BOT_STORE_KEY`) rather
than a file, `npx @peachysocial/bot rekey --print` prints the new
`PEACHY_BOT_STORE_KEY=…` line instead. It is the only copy of the new key,
so don't pipe it anywhere you can't read back: put it in your secrets, start
the bot, then delete the old key.

### Move the bot to another store

To move a running bot, say from SQLite on your computer to Postgres, copy
its store whole, under the same key:

```sh
npx @peachysocial/bot store copy --from ./data/bot.db --to postgres://user:password@host/db
```

Run it with the bot stopped, on the machine that holds the old store.

The old copy is marked moved and refuses to start, so two copies never run
the same bot. Never restore a store from an old backup: the SDK refuses a
store older than the one it last ran, because the bot's chats have moved on.

### Lost the store: Link a new server

If the store or its key is lost, reset the bot's keys: **Settings ›
Organizations and bots › your bot › Link a new server** (on Mac, **You ›
Organizations and bots**). Peachy revokes the
old device and gives you a new Connect code. Link a new, empty store with it.

People see it happen: the bot leaves the chats it's in, and an admin in each
can add it back.

If the store is fine but you think its token leaked, tap **Unlink its
server** instead: the token stops working, the keys stay, and you get a
new code. Run `npx @peachysocial/bot connect` on the same store with it (or set it
as `PEACHY_CONNECT_CODE` for one start), and the bot is back in every chat.

## Privacy labels checklist

What you enter in the listing is drawn on your bot's page and on the sheet
people see before their first message to it, with your name on it. A false
label is a reason to ban the bot under Peachy's
[Developer Terms](https://pchy.app/developer-terms). Before you
create the bot, check each line:

- [ ] **Where messages go.** Name every service that receives people's
  words, such as an AI provider. "Nowhere" only if that is true. People
  read it under "Messages to @yourbot go to *Owner*", the owner the
  listing names (you, or your organization).
- [ ] **How long it keeps them.** Say how long your bot, its logs and every
  service in "Where messages go" keep what people send. This template logs
  no message text (`logContent: false`) and stores none itself. The SDK's
  encrypted store keeps the bot's own replies for 14 days, so a phone that
  missed one can ask for it again; that isn't keeping people's messages.
- [ ] **Privacy policy link.** A page that says the same.
- [ ] **What it can do.** Ask only for what it uses: posting on its own,
  reacting, joining calls.
- [ ] **Who can use it.** You and testers, or anyone once published, is
  the gate; `PEACHY_BOT_ALLOW` can only narrow it.
- [ ] **Commands.** The bot sends `bot.ts`'s commands when it starts.

More: https://pchy.app/developers/privacy-labels.

## License

MIT-0 (MIT No Attribution): copy it into your own bot without keeping a copyright notice. See `LICENSE`.
