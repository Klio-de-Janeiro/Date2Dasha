(() => {
  const config = window.ROMANTIC_APP_CONFIG;

  if (!config || !Array.isArray(config.questions) || config.questions.length === 0) {
    throw new Error("ROMANTIC_APP_CONFIG.questions должен содержать хотя бы одну фразу.");
  }

  const card = document.getElementById("questionCard");
  const questionText = document.getElementById("questionText");
  const progressText = document.getElementById("progressText");
  const yesButton = document.getElementById("yesButton");
  const noButton = document.getElementById("noButton");
  const finalScreen = document.getElementById("finalScreen");
  const finalTitle = finalScreen.querySelector(".final__title");
  const finalText = finalScreen.querySelector(".final__text");
  const canvas = document.getElementById("celebrationCanvas");
  const ctx = canvas.getContext("2d");

  let currentIndex = 0;
  let celebrationFrame = null;
  let particles = [];

  yesButton.textContent = config.buttons?.yes ?? "Да";
  noButton.textContent = config.buttons?.no ?? "Нет";
  finalTitle.textContent = config.final?.title ?? "Тогда это свидание!";
  finalText.textContent = config.final?.text ?? "До встречи ❤️";

  function renderQuestion() {
    questionText.textContent = config.questions[currentIndex];
    progressText.textContent = `${currentIndex + 1} / ${config.questions.length}`;

    card.classList.remove("is-changing");
    void card.offsetWidth;
    card.classList.add("is-changing");

    restoreNoButton();
  }

  function goNext() {
    if (currentIndex < config.questions.length - 1) {
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

  // «Нет» двигается только внутри карточки.
  // Левая/правая половина выбирается случайно, а вокруг «Да»
  // создаётся увеличенная запрещённая зона.
  function moveNoButton(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const buttonRect = noButton.getBoundingClientRect();
    const yesRect = yesButton.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    const isMobile = window.innerWidth <= 560;

    // Не даём кнопке прижиматься к границам самой карточки.
    const cardPaddingX = isMobile ? 22 : 42;
    const cardPaddingTop = isMobile ? 70 : 90;
    const cardPaddingBottom = isMobile ? 24 : 36;

    // Увеличенный визуальный зазор от «Да».
    const gapFromYes = isMobile ? 52 : 86;

    const minX = cardRect.left + cardPaddingX;
    const maxX = cardRect.right - cardPaddingX - buttonRect.width;

    // Используем центральную/нижнюю часть карточки:
    // кнопка остаётся около содержания, но может свободно бегать внутри.
    const minY = Math.max(
      cardRect.top + cardPaddingTop,
      cardRect.top + cardRect.height * 0.34
    );

    const maxY = cardRect.bottom - cardPaddingBottom - buttonRect.height;

    const cardCenterX = cardRect.left + cardRect.width / 2;
    const sideGap = isMobile ? 8 : 18;

    const currentCenterX = buttonRect.left + buttonRect.width / 2;
    const currentCenterY = buttonRect.top + buttonRect.height / 2;

    const overlapsYes = (x, y) => {
      const left = x;
      const right = x + buttonRect.width;
      const top = y;
      const bottom = y + buttonRect.height;

      return !(
        right < yesRect.left - gapFromYes ||
        left > yesRect.right + gapFromYes ||
        bottom < yesRect.top - gapFromYes ||
        top > yesRect.bottom + gapFromYes
      );
    };

    const isFarEnoughFromCurrent = (x, y) => {
      const candidateCenterX = x + buttonRect.width / 2;
      const candidateCenterY = y + buttonRect.height / 2;

      return Math.hypot(
        candidateCenterX - currentCenterX,
        candidateCenterY - currentCenterY
      ) >= (isMobile ? 75 : 110);
    };

    const randomPointForSide = (side) => {
      let sideMinX = minX;
      let sideMaxX = maxX;

      if (side === "left") {
        sideMaxX = Math.min(
          maxX,
          cardCenterX - sideGap - buttonRect.width
        );
      } else {
        sideMinX = Math.max(
          minX,
          cardCenterX + sideGap
        );
      }

      if (sideMaxX < sideMinX) {
        return null;
      }

      return {
        x: randomBetween(sideMinX, sideMaxX),
        y: randomBetween(minY, Math.max(minY, maxY))
      };
    };

    // С вероятностью 50/50 сначала ищем позицию слева или справа.
    // Если на выбранной стороне места нет, автоматически пробуем другую.
    const preferredSide = Math.random() < 0.5 ? "left" : "right";
    const sides = [
      preferredSide,
      preferredSide === "left" ? "right" : "left"
    ];

    let bestPosition = null;

    for (const side of sides) {
      for (let attempt = 0; attempt < 45; attempt += 1) {
        const candidate = randomPointForSide(side);

        if (!candidate) {
          break;
        }

        if (
          !overlapsYes(candidate.x, candidate.y) &&
          isFarEnoughFromCurrent(candidate.x, candidate.y)
        ) {
          bestPosition = candidate;
          break;
        }
      }

      if (bestPosition) {
        break;
      }
    }

    // Запасной поиск по всей разрешённой области карточки.
    if (!bestPosition) {
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const candidate = {
          x: randomBetween(minX, Math.max(minX, maxX)),
          y: randomBetween(minY, Math.max(minY, maxY))
        };

        if (!overlapsYes(candidate.x, candidate.y)) {
          bestPosition = candidate;
          break;
        }
      }
    }

    // Крайний fallback для очень маленьких экранов.
    if (!bestPosition) {
      bestPosition = {
        x: minX,
        y: minY
      };
    }

    noButton.classList.add("is-running");
    noButton.style.left = `${bestPosition.x}px`;
    noButton.style.top = `${bestPosition.y}px`;
  }

  function restoreNoButton() {
    noButton.classList.remove("is-running");
    noButton.style.removeProperty("left");
    noButton.style.removeProperty("top");
  }

  function randomBetween(min, max) {
    if (max <= min) return min;
    return Math.random() * (max - min) + min;
  }

  yesButton.addEventListener("click", goNext);

  noButton.addEventListener("pointerenter", moveNoButton);
  noButton.addEventListener("pointerdown", moveNoButton);
  noButton.addEventListener("touchstart", moveNoButton, { passive: false });
  noButton.addEventListener("click", (event) => {
    event.preventDefault();
    moveNoButton(event);
  });

  // Даже если курсор не попал прямо на кнопку, она убегает,
  // когда указатель подходит к ней достаточно близко.
  window.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    if (card.classList.contains("hidden")) return;

    const rect = noButton.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const distance = Math.hypot(
      event.clientX - centerX,
      event.clientY - centerY
    );

    if (distance < 95) {
      moveNoButton();
    }
  });

  window.addEventListener("resize", () => {
    if (noButton.classList.contains("is-running")) {
      moveNoButton();
    }
    resizeCanvas();
  });

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function createParticle() {
    const isHeart = Math.random() > 0.48;

    return {
      x: Math.random() * window.innerWidth,
      y: -30 - Math.random() * window.innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 1.6,
      vy: 1.7 + Math.random() * 3.2,
      size: 6 + Math.random() * 9,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.08,
      alpha: 0.75 + Math.random() * 0.25,
      kind: isHeart ? "heart" : "confetti",
      hue: [330, 345, 18, 280, 200][Math.floor(Math.random() * 5)]
    };
  }

  function drawHeart(x, y, size, rotation, alpha, hue) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(size / 18, size / 18);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `hsl(${hue} 78% 72%)`;

    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.bezierCurveTo(-12, -4, -9, -14, 0, -8);
    ctx.bezierCurveTo(9, -14, 12, -4, 0, 5);
    ctx.fill();
    ctx.restore();
  }

  function drawConfetti(particle) {
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);
    ctx.globalAlpha = particle.alpha;
    ctx.fillStyle = `hsl(${particle.hue} 82% 72%)`;
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
    particles = Array.from({ length: 150 }, createParticle);

    cancelAnimationFrame(celebrationFrame);

    const animate = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotation += particle.spin;

        if (particle.kind === "heart") {
          drawHeart(
            particle.x,
            particle.y,
            particle.size,
            particle.rotation,
            particle.alpha,
            particle.hue
          );
        } else {
          drawConfetti(particle);
        }

        if (particle.y > window.innerHeight + 40) {
          Object.assign(particle, createParticle(), {
            y: -40,
            x: Math.random() * window.innerWidth
          });
        }
      }

      celebrationFrame = requestAnimationFrame(animate);
    };

    animate();
  }

  resizeCanvas();
  renderQuestion();
})();
