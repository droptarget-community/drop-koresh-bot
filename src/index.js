const { Telegraf } = require("telegraf");
const { Application, Router } = require("@cfworker/web");
const createTelegrafMiddware = require("cfworker-middware-telegraf");

const commands = require("./commands");

function registerCommands(bot, commands) {
  Object.values(commands).forEach((cmd) => cmd.init(bot));
}

function usersStoreToStats(users) {
  return users
    .filter((u) => u.is_bot === false)
    .sort((a, b) => b.messagesCount - a.messagesCount)
    .map(
      ({ username, messagesCount, userTitle }) =>
        `${username}: «${userTitle}» (${messagesCount})`
    )
    .join("\n");
}

const DT_CHAT_ID = -1001737907273;

const bot = new Telegraf(process.env.BOT_TOKEN, {
  telegram: { webhookReply: true },
});

registerCommands(bot, commands);

const TOP_LIST_LIMIT = 10;

const messagerCountTitles = [
  [0, 10, "ти хто вабщє"],
  [10, 50, "трейні"],
  [50, 100, "джун"],
  [100, 300, "мідл"],
  [300, 600, "сіньйор"],
  [600, 1000, "тімлід"],
  [1000, 1500, "продакт менеджер"],
  [1500, 2000, "архітектор"],
  [2000, 3000, "CTO"],
  [3000, 5000, "CEO"],
  [5000, Infinity, "Мішок з баблом"],
];

function messagesCountToTitle(messagesCount) {
  return messagerCountTitles.find(
    ([from, to]) => messagesCount >= from && messagesCount < to
  )[2];
}

bot.command("/eval", async function (ctx) {
  if (typeof ctx.message.text === "string") {
    await fetch("https://drop-koresh-eval.vercel.app/api/eval", {
      method: "POST",
      headers: { "content-type": "application/json;charset=UTF-8" },
      body: JSON.stringify({ code: ctx.message.text.replace("/eval", "") }),
    })
      .then((res) => res.json())
      .then(({ result, error }) => {
        if (typeof error === "string") {
          ctx.reply(error);
        } else if (typeof result === "string") {
          ctx.reply(result);
        }
      })
      .catch((error) => {
        ctx.reply("something went wrong...");
      });
  }
});

bot.command("/drop_stats", async function (ctx) {
  if (ctx.update.message.chat.id === DT_CHAT_ID) {
    const username = (ctx.update.message.text.match(
      /\/drop_stats@drop_koresh_bot @(\S+)/
    ) ||
      ctx.update.message.text.match(/\/drop_stats @(\S+)/) ||
      [])[1];
    console.log(
      "username",
      ctx.update.message.text.match(/\/drop_stats @(\S+)/)
    );
    if (username) {
      const user = USERS.get(username, { type: "json" });
      if (user) {
        user.userTitle = messagesCountToTitle(user.messagesCount);
        ctx.reply(usersStoreToStats([user]));
      } else {
        ctx.reply("no stats");
      }
    } else {
      const keys = (await USERS.list()).keys.map((k) => k.name);
      if (keys.length > 0) {
        const users = await Promise.all(
          keys.map((k) => USERS.get(k, { type: "json" }))
        );
        const sortedUsers = users
          .sort((a, b) => b.messagesCount - a.messagesCount)
          .slice(0, TOP_LIST_LIMIT)
          .map((u) => {
            u.userTitle = messagesCountToTitle(u.messagesCount);
            return u;
          });

        const s = usersStoreToStats(sortedUsers);
        ctx.reply(s);
      } else {
        ctx.reply("no stats");
      }
    }
  }
});

const hears = [
  [/\+0/, "Який 0? Ти шо странний"],
  [/ шо робить /, "єбашить як раб"],
  [/ шо /, "шопопало говориш"],
  [/npm install/, "я щас тобі зроблю rm -rf /"],
  [/горить/, "ну мені нравиця, як воно горить"],
  [/русня|русні/, "русні пизда, я все сказав"],
  [/ давай /, "а давай ти підеш поспиш"],
  [/фронтенд/, "вротенд"],
  [/добрий ранок/, "і тобі не боліть, помився вже?"],
  [/прильот/, "єбєйший, прямо в рот"],
];

// TODO:
// 1. Top 10 [DONE]
// 2. Exclude one-letter messages [DONE]
// 3. Ask new joiner to tell about themselves
// 4. Celebrate new title [DONE]
// 5. Show # of posts till the next title

function replayWithJoke(ctx) {
  const msg = (hears.find(([pattern]) => pattern.test(ctx.message.text)) ||
    [])[1];
  if (msg) {
    ctx.reply(msg);
  }
}

async function trackMessageCount(ctx) {
  const uid = ctx.message.from.id.toString();
  const user = (await USERS.get(uid, { type: "json" })) || ctx.message.from;

  user.messagesCount = (user.messagesCount || 0) + 1;

  await USERS.put(uid, JSON.stringify(user));
}

function messageHasValidText(message) {
  return typeof message.text == "string" && message.text.length > 1;
}

bot.on("message", async function (ctx) {
  if (ctx.chat.id === DT_CHAT_ID) {
    if (typeof ctx.message.from.id === "number") {
      if (messageHasValidText(ctx.message)) {
        replayWithJoke(ctx);
        await trackMessageCount(ctx);
      }
    } else {
      console.error("user id is not a number");
    }
  }
});

const router = new Router();

router.post("/webhook", createTelegrafMiddware(bot));

router.post("/eval-js", ({ req, res }) => {
  console.log(req);
  res.status = 200;
});

new Application().use(router.middleware).listen();
