const eng_titles = [
  "світчер",
  "трейні",
  "джун",
  "джун який думає шо все знає",
  "мідл який прихуїв",
  "нормальний інженер",
  "майже синьйор, але ще не поставив вініри",
  "синьйор якому недоплачуюють",
  "синьйор який знає більше за всіх шо кому треба робити",
  "гальєрист зи стажем",
  "тімлід патєряшка",
  "менеджер грубіян",
  "CEO жлоб",
];

function pickRandomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function init(bot) {
  bot.command("/my_title", (ctx) => ctx.reply(pickRandomFromArray(eng_titles)));
}

module.exports = { init };
