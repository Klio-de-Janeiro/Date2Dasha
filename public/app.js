(() => {
  const config = window.ROMANTIC_APP_CONFIG;

  if (
    !config ||
    !Array.isArray(config.questions) ||
    config.questions.length === 0
  ) {
    throw new Error(
      "ROMANTIC_APP_CONFIG.questions должен содержать хотя бы один экран."
    );
  }

  const card = document.getElementById("questionCard");
  const questionText = document.getElementById("questionText");
  const progressText = document.getElementById("progressText");
  const actions = document.getElementById("actions");

  const finalScreen = document.getElementById("finalScreen");
  const finalTitle = finalScreen.querySelector(".final__title");
  const finalText = finalScreen.querySelector(".final__text");

  const canvas = document.getElementById("celebrationCanvas");
  const ctx = canvas.getContext("2d");

  let currentIndex = 0;

  let noButton = null;
  let yesButton = null;

  let noMoveTimer = null;
  let lastNoMoveAt = 0;

  let celebrationFrame = null;
  let particles = [];

  finalTitle.textContent =
    config.final?.title ?? "Обнимаю крепко!";

  finalText.textContent =
    config.final?.text ?? "Я рядом ❤️";


  // =========================================================
  // РЕНДЕР ТЕКУЩЕГО ЭКРАНА
  // =========================================================

  function renderQuestion() {
    stopNoAutoMove();

    const question = config.questions[currentIndex];

    questionText.textContent = question.text;

    progressText.textContent =
      `${currentIndex + 1} / ${config.questions.length}`;

    actions.replaceChildren();

    noButton = null;
    yesButton = null;

    card.classList.remove("is-changing");

    void card.offsetWidth;

    card.classList.add("is-changing");


    // Первый экран с произвольными вариантами ответа
    if (question.mode === "choice") {
      renderChoiceButtons(question);
      return;
    }


    // Обычный экран Да / Нет
    renderYesNoButtons();
  }


  // =========================================================
  // ПЕРВЫЙ ЭКРАН:
  // "Хорошо 😊" / "Не очень 😔"
  // =========================================================

  function renderChoiceButtons(question) {
    const choices = Array.isArray(question.choices)
      ? question.choices
      : [];

    choices.forEach((choice) => {
      const modifier =
        choice.variant === "positive"
          ? "button--positive"
          : "button--soft";

      const button = createButton(
        choice.label,
        modifier
      );

      button.addEventListener(
        "click",
        goNext
      );

      actions.appendChild(button);
    });
  }


  // =========================================================
  // ЭКРАНЫ ДА / НЕТ
  // =========================================================

  function renderYesNoButtons() {
    yesButton = createButton(
      config.buttons?.yes ?? "Да",
      "button--yes"
    );

    noButton = createButton(
      config.buttons?.no ?? "Нет",
      "button--no"
    );


    yesButton.addEventListener(
      "click",
      goNext
    );


    actions.append(
      yesButton,
      noButton
    );


    bindNoButtonEvents();


    // Ждём, пока браузер реально отрисует кнопки.
    // После этого переносим «Нет» в случайную позицию.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        moveNoButton();

        startNoAutoMove();
      });
    });
  }


  // =========================================================
  // СОЗДАНИЕ КНОПКИ
  // =========================================================

  function createButton(
    label,
    modifierClass
  ) {
    const button =
      document.createElement("button");

    button.type = "button";

    button.className =
      `button ${modifierClass}`;

    button.textContent = label;

    return button;
  }


  // =========================================================
  // ПЕРЕХОД НА СЛЕДУЮЩИЙ ЭКРАН
  // =========================================================

  function goNext() {
    stopNoAutoMove();

    if (
      currentIndex <
      config.questions.length - 1
    ) {
      currentIndex += 1;

      renderQuestion();

      return;
    }


    showFinal();
  }


  // =========================================================
  // СОБЫТИЯ КНОПКИ «НЕТ»
  // =========================================================

  function bindNoButtonEvents() {
    if (!noButton) {
      return;
    }


    const runAway = (event) => {
      event.preventDefault();

      event.stopPropagation();

      moveNoButton();
    };


    /*
      pointerdown работает:
      - на мыши;
      - на телефоне;
      - на планшете.

      Поэтому кнопка успевает переместиться
      ещё до обычного click.
    */
    noButton.addEventListener(
      "pointerdown",
      runAway
    );


    /*
      Fallback для некоторых старых мобильных
      браузеров.
    */
    noButton.addEventListener(
      "touchstart",
      runAway,
      {
        passive: false
      }
    );


    /*
      На компьютере кнопка дополнительно
      убегает при наведении мыши.
    */
    noButton.addEventListener(
      "pointerenter",
      (event) => {
        if (
          event.pointerType === "mouse"
        ) {
          moveNoButton();
        }
      }
    );


    /*
      Даже если браузеру каким-то образом
      удалось создать click — ничего не происходит.
    */
    noButton.addEventListener(
      "click",
      (event) => {
        event.preventDefault();

        event.stopPropagation();
      }
    );
  }


  // =========================================================
  // АВТОМАТИЧЕСКОЕ ПЕРЕМЕЩЕНИЕ «НЕТ»
  // =========================================================

  function startNoAutoMove() {
    stopNoAutoMove();


    const interval =
      Number(
        config.behavior?.noMoveIntervalMs
      ) || 10000;


    noMoveTimer =
      window.setInterval(() => {

        const currentQuestion =
          config.questions[currentIndex];


        if (
          noButton &&
          !card.classList.contains("hidden") &&
          currentQuestion?.mode === "yes-no"
        ) {
          moveNoButton();
        }

      }, Math.max(1500, interval));
  }


  function stopNoAutoMove() {
    if (noMoveTimer !== null) {
      clearInterval(noMoveTimer);

      noMoveTimer = null;
    }
  }


  // =========================================================
  // ПЕРЕМЕЩЕНИЕ КНОПКИ «НЕТ»
  // =========================================================

  function moveNoButton() {
    if (
      !noButton ||
      !yesButton
    ) {
      return;
    }


    /*
      На телефоне некоторые браузеры могут
      одновременно вызвать pointerdown и touchstart.

      Этот небольшой debounce не позволяет
      кнопке переместиться два раза подряд.
    */
    const now = performance.now();

    if (
      now - lastNoMoveAt < 140
    ) {
      return;
    }

    lastNoMoveAt = now;


    const cardRect =
      card.getBoundingClientRect();

    const yesRect =
      yesButton.getBoundingClientRect();

    const noRect =
      noButton.getBoundingClientRect();


    const isMobile =
      window.innerWidth <= 560;


    /*
      Отступы от границ карточки.
    */
    const edgePaddingX =
      isMobile ? 16 : 34;

    const edgePaddingTop =
      isMobile ? 100 : 120;

    const edgePaddingBottom =
      isMobile ? 18 : 30;


    /*
      Минимальная дистанция от кнопки «Да».
      Сделана довольно большой специально.
    */
    const gapFromYes =
      isMobile ? 70 : 105;


    /*
      Насколько далеко кнопка должна
      прыгнуть от предыдущего положения.
    */
    const minimumJump =
      isMobile ? 70 : 110;


    // ---------------------------------------------------------
    // Разрешённая область движения внутри карточки
    // ---------------------------------------------------------

    const minX =
      edgePaddingX;


    const maxX =
      Math.max(
        minX,

        cardRect.width -
        edgePaddingX -
        noRect.width
      );


    const minY =
      Math.min(
        cardRect.height -
        noRect.height -
        edgePaddingBottom,

        Math.max(
          edgePaddingTop,

          cardRect.height *
          (isMobile ? 0.32 : 0.30)
        )
      );


    const maxY =
      Math.max(
        minY,

        cardRect.height -
        edgePaddingBottom -
        noRect.height
      );


    // ---------------------------------------------------------
    // Переводим координаты «Да»
    // из viewport в координаты карточки
    // ---------------------------------------------------------

    const yesLocal = {
      left:
        yesRect.left -
        cardRect.left,

      right:
        yesRect.right -
        cardRect.left,

      top:
        yesRect.top -
        cardRect.top,

      bottom:
        yesRect.bottom -
        cardRect.top
    };


    // ---------------------------------------------------------
    // Текущая позиция кнопки «Нет»
    // ---------------------------------------------------------

    const currentLeft =
      noButton.classList.contains(
        "is-running"
      )
        ? parseFloat(
            noButton.style.left
          ) || 0
        : noRect.left -
          cardRect.left;


    const currentTop =
      noButton.classList.contains(
        "is-running"
      )
        ? parseFloat(
            noButton.style.top
          ) || 0
        : noRect.top -
          cardRect.top;


    const currentCenterX =
      currentLeft +
      noRect.width / 2;


    const currentCenterY =
      currentTop +
      noRect.height / 2;


    // ---------------------------------------------------------
    // Проверка пересечения с кнопкой «Да»
    // ---------------------------------------------------------

    const overlapsYes =
      (x, y) => {

        const left = x;

        const right =
          x + noRect.width;

        const top = y;

        const bottom =
          y + noRect.height;


        return !(
          right <
            yesLocal.left -
            gapFromYes ||

          left >
            yesLocal.right +
            gapFromYes ||

          bottom <
            yesLocal.top -
            gapFromYes ||

          top >
            yesLocal.bottom +
            gapFromYes
        );
      };


    // ---------------------------------------------------------
    // Расстояние от предыдущей позиции
    // ---------------------------------------------------------

    const distanceFromCurrent =
      (x, y) => {

        const centerX =
          x + noRect.width / 2;

        const centerY =
          y + noRect.height / 2;


        return Math.hypot(
          centerX -
            currentCenterX,

          centerY -
            currentCenterY
        );
      };


    const cardCenterX =
      cardRect.width / 2;


    /*
      При каждом новом перемещении
      случайно выбираем:

      50% — сначала ищем слева;
      50% — сначала ищем справа.
    */
    const preferredSide =
      Math.random() < 0.5
        ? "left"
        : "right";


    let best = null;

    let bestScore =
      -Infinity;


    // ---------------------------------------------------------
    // Ищем новую позицию
    // ---------------------------------------------------------

    for (
      let attempt = 0;
      attempt < 120;
      attempt += 1
    ) {

      /*
        Сначала большая часть попыток
        приходится на случайно выбранную сторону.

        Потом пробуем противоположную.
      */
      const side =
        attempt < 70
          ? preferredSide
          : preferredSide === "left"
            ? "right"
            : "left";


      let sideMinX;

      let sideMaxX;


      if (side === "left") {
        sideMinX = minX;

        sideMaxX =
          Math.min(
            maxX,

            cardCenterX -
            noRect.width -
            10
          );
      } else {
        sideMinX =
          Math.max(
            minX,

            cardCenterX + 10
          );

        sideMaxX =
          maxX;
      }


      if (
        sideMaxX <
        sideMinX
      ) {
        continue;
      }


      const x =
        randomBetween(
          sideMinX,
          sideMaxX
        );


      const y =
        randomBetween(
          minY,
          maxY
        );


      // Не разрешаем залезать на «Да»
      if (
        overlapsYes(x, y)
      ) {
        continue;
      }


      const jumpDistance =
        distanceFromCurrent(
          x,
          y
        );


      /*
        Большую часть попыток игнорируем
        слишком близкие позиции.
      */
      if (
        jumpDistance <
          minimumJump &&
        attempt < 90
      ) {
        continue;
      }


      /*
        Предпочитаем более дальние
        позиции + добавляем немного
        случайности.
      */
      const score =
        jumpDistance +
        Math.random() * 80;


      if (
        score > bestScore
      ) {
        bestScore = score;

        best = {
          x,
          y
        };
      }
    }


    // ---------------------------------------------------------
    // Запасной алгоритм для маленьких телефонов
    // ---------------------------------------------------------

    if (!best) {

      for (
        let attempt = 0;
        attempt < 100;
        attempt += 1
      ) {

        const x =
          randomBetween(
            minX,
            maxX
          );


        const y =
          randomBetween(
            minY,
            maxY
          );


        if (
          !overlapsYes(x, y)
        ) {
          best = {
            x,
            y
          };

          break;
        }
      }
    }


    /*
      Если экран настолько маленький,
      что безопасной позиции вообще нет,
      просто ничего не делаем.

      Это лучше, чем отправлять кнопку
      за границы карточки.
    */
    if (!best) {
      return;
    }


    // ---------------------------------------------------------
    // Устанавливаем новую позицию
    // ---------------------------------------------------------

    noButton.classList.add(
      "is-running"
    );


    noButton.style.left =
      `${best.x}px`;


    noButton.style.top =
      `${best.y}px`;
  }


  // =========================================================
  // СЛУЧАЙНОЕ ЧИСЛО
  // =========================================================

  function randomBetween(
    min,
    max
  ) {
    if (max <= min) {
      return min;
    }

    return (
      Math.random() *
        (max - min) +
      min
    );
  }


  // =========================================================
  // ФИНАЛЬНЫЙ ЭКРАН
  // =========================================================

  function showFinal() {
    stopNoAutoMove();

    card.classList.add(
      "hidden"
    );

    finalScreen.classList.remove(
      "hidden"
    );

    startCelebration();
  }


  // =========================================================
  // CANVAS
  // =========================================================

  function resizeCanvas() {
    const dpr =
      Math.min(
        window.devicePixelRatio || 1,
        2
      );


    canvas.width =
      Math.floor(
        window.innerWidth * dpr
      );


    canvas.height =
      Math.floor(
        window.innerHeight * dpr
      );


    canvas.style.width =
      `${window.innerWidth}px`;


    canvas.style.height =
      `${window.innerHeight}px`;


    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );
  }


  // =========================================================
  // ЧАСТИЦЫ
  // =========================================================

  function createParticle() {
    const isHeart =
      Math.random() > 0.48;


    return {
      x:
        Math.random() *
        window.innerWidth,

      y:
        -30 -
        Math.random() *
        window.innerHeight *
        0.35,

      vx:
        (Math.random() - 0.5) *
        1.6,

      vy:
        1.7 +
        Math.random() *
        3.2,

      size:
        6 +
        Math.random() *
        9,

      rotation:
        Math.random() *
        Math.PI *
        2,

      spin:
        (Math.random() - 0.5) *
        0.08,

      alpha:
        0.75 +
        Math.random() *
        0.25,

      kind:
        isHeart
          ? "heart"
          : "confetti",

      hue:
        [
          330,
          345,
          18,
          280,
          200
        ][
          Math.floor(
            Math.random() * 5
          )
        ]
    };
  }


  function drawHeart(
    x,
    y,
    size,
    rotation,
    alpha,
    hue
  ) {
    ctx.save();

    ctx.translate(x, y);

    ctx.rotate(rotation);

    ctx.scale(
      size / 18,
      size / 18
    );

    ctx.globalAlpha =
      alpha;

    ctx.fillStyle =
      `hsl(${hue} 78% 72%)`;


    ctx.beginPath();

    ctx.moveTo(
      0,
      5
    );

    ctx.bezierCurveTo(
      -12,
      -4,
      -9,
      -14,
      0,
      -8
    );

    ctx.bezierCurveTo(
      9,
      -14,
      12,
      -4,
      0,
      5
    );

    ctx.fill();

    ctx.restore();
  }


  function drawConfetti(
    particle
  ) {
    ctx.save();


    ctx.translate(
      particle.x,
      particle.y
    );


    ctx.rotate(
      particle.rotation
    );


    ctx.globalAlpha =
      particle.alpha;


    ctx.fillStyle =
      `hsl(${particle.hue} 82% 72%)`;


    ctx.fillRect(
      -particle.size * 0.45,
      -particle.size * 0.2,
      particle.size * 0.9,
      particle.size * 0.4
    );


    ctx.restore();
  }


  // =========================================================
  // ФИНАЛЬНАЯ АНИМАЦИЯ
  // =========================================================

  function startCelebration() {
    resizeCanvas();


    particles =
      Array.from(
        {
          length: 150
        },
        createParticle
      );


    cancelAnimationFrame(
      celebrationFrame
    );


    const animate = () => {

      ctx.clearRect(
        0,
        0,
        window.innerWidth,
        window.innerHeight
      );


      for (
        const particle
        of particles
      ) {

        particle.x +=
          particle.vx;

        particle.y +=
          particle.vy;

        particle.rotation +=
          particle.spin;


        if (
          particle.kind ===
          "heart"
        ) {
          drawHeart(
            particle.x,
            particle.y,
            particle.size,
            particle.rotation,
            particle.alpha,
            particle.hue
          );
        } else {
          drawConfetti(
            particle
          );
        }


        if (
          particle.y >
          window.innerHeight + 40
        ) {

          Object.assign(
            particle,
            createParticle(),
            {
              x:
                Math.random() *
                window.innerWidth,

              y: -40
            }
          );
        }
      }


      celebrationFrame =
        requestAnimationFrame(
          animate
        );
    };


    animate();
  }


  // =========================================================
  // ИЗМЕНЕНИЕ РАЗМЕРА ЭКРАНА
  // =========================================================

  window.addEventListener(
    "resize",
    () => {

      resizeCanvas();


      if (
        noButton &&
        config.questions[
          currentIndex
        ]?.mode === "yes-no"
      ) {
        requestAnimationFrame(
          moveNoButton
        );
      }
    }
  );


  /*
    Особенно важно для телефона:
    переход portrait ↔ landscape.
  */
  window.addEventListener(
    "orientationchange",
    () => {

      window.setTimeout(
        () => {

          resizeCanvas();


          if (
            noButton &&
            config.questions[
              currentIndex
            ]?.mode === "yes-no"
          ) {
            moveNoButton();
          }

        },
        180
      );
    }
  );


  // =========================================================
  // ЗАПУСК
  // =========================================================

  resizeCanvas();

  renderQuestion();
})();