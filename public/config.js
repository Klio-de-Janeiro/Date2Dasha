window.ROMANTIC_APP_CONFIG = {
  questions: [
    {
      text: "Привет! Как ты себя чувствуешь?",
      mode: "choice",
      choices: [
        {
          label: "Хорошо 😊",
          variant: "positive"
        },
        {
          label: "Не очень 😔",
          variant: "soft"
        }
      ]
    },

    {
      text: "Хочешь, я тебя развеселю?",
      mode: "yes-no"
    },

    {
      text: "Готова улыбнуться прямо сейчас?",
      mode: "yes-no"
    },

    {
      text: "Выздоравливай скорее! Ты самая сильная",
      mode: "yes-no"
    }
  ],

  final: {
    title: "Обнимаю крепко!",
    text: "Скоро всё наладится, я рядом ❤️"
  },

  buttons: {
    yes: "Да",
    no: "Нет"
  },

  behavior: {
    // Через сколько миллисекунд кнопка «Нет»
    // сама меняет положение.
    noMoveIntervalMs: 10000
  }
};