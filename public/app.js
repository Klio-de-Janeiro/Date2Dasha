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
  let celebrationFrame = null;
  let particles = [];

  finalTitle.textContent =
    config.final?.title ?? "Люблю тебя ❤️";

  finalText.textContent =
    config.final?.text ?? "Ты у меня самая лучшая.";

  function renderQuestion() {
    const question = config.questions[currentIndex];

    questionText.textContent =
      typeof question === "string"
        ? question
        : question.text;

    progressText.textContent =
      `${currentIndex + 1} / ${config.questions.length}`;

    actions.replaceChildren();

    card.classList.remove("is-changing");
    void card.offsetWidth;
    card.classList.add("is-changing");

    renderButtons(question);
  }

  function renderButtons(question) {
    if (
      typeof question === "object" &&
      Array.isArray(question.choices) &&
      question.choices.length > 0
    ) {
      question.choices.forEach((choice) => {
        const button = createButton(
          choice.label ?? "Дальше ❤️",
          choice.variant ?? "positive"
        );

        button.addEventListener("click", goNext);
        actions.appendChild(button);
      });

      return;
    }

    const button = createButton(
      "Дальше ❤️",
      "positive"
    );

    button.addEventListener("click", goNext);
    actions.appendChild(button);
  }

  function createButton(label, variant) {
    const button = document.createElement("button");

    button.type = "button";

    const modifier =
      variant === "soft"
        ? "button--soft"
        : "button--positive";

    button.className =
      `button ${modifier}`;

    button.textContent = label;

    return button;
  }

  function goNext() {
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

  function showFinal() {
    card.classList.add("hidden");
    finalScreen.classList.remove("hidden");

    startCelebration();
  }

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

  function createParticle() {
    const isHeart =
      Math.random() > 0.42;

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
        1.5 +
        Math.random() *
        3,

      size:
        6 +
        Math.random() *
        10,

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
        [330, 345, 10, 290, 320][
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

    ctx.moveTo(0, 5);

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

  function startCelebration() {
    resizeCanvas();

    particles =
      Array.from(
        { length: 160 },
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
          particle.kind === "heart"
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

  window.addEventListener(
    "resize",
    resizeCanvas
  );

  window.addEventListener(
    "orientationchange",
    () => {
      window.setTimeout(
        resizeCanvas,
        180
      );
    }
  );

  resizeCanvas();
  renderQuestion();
})();
