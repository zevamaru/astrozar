function $(selector) {
  return document.querySelector(selector);
}

function restore() {
  $("#query").value = user.query;
  if (typeof user.circle === "number") {
    $(".slot.circle").classList.remove("pulse");
    $(".slot.circle").classList.add("done");
    $(".slot.circle").classList.add("float");
  }
  if (typeof user.square === "number") {
    $(".slot.square").classList.remove("pulse");
    $(".slot.square").classList.add("done");
    $(".slot.square").classList.add("float");
  }
  if (typeof user.triangle === "number") {
    $(".slot.triangle").classList.remove("pulse");
    $(".slot.triangle").classList.add("done");
    $(".slot.triangle").classList.add("float");
  }
  swiper.allowSlideNext = true;
  swiper.slideTo(user.slide, 1000);
  swiper.allowSlideNext = false;
  tooltip.show("slots", "zoomInDown");
  $("#background").classList.add("universe");
  if (user.answer) {
    sound.play("the-answer");
    showAnswer();
  } else if (
    typeof user.triangle === "number" &&
    typeof user.square === "number" &&
    typeof user.circle === "number"
  ) {
    sound.play("alea-iacta-est");
    aleaIactaEst();
  }
}

function save(slide) {
  user.slide = slide;
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("lastSlide", slide);
}

function drawYourCards() {
  if (!user.query) return;
  const delay = localStorage.getItem("shuffling-cards") ? 1500 : 3000;
  setTimeout(() => {
    nextSlide();
    tooltip.show("slots", "zoomInDown");
    localStorage.setItem("shuffling-cards", 1);
  }, delay);
  nextSlide();
  user.decks.circle = generateDeck();
  user.decks.square = generateDeck();
  user.decks.triangle = generateDeck();
  save(3);
}

function generateDeck() {
  const deck = [];
  for (let i = 0; i < 10; i++) {
    let cardIndex;
    do {
      cardIndex = Math.floor(Math.random() * 10);
    } while (deck.includes(cardIndex));
    deck.push(cardIndex);
  }
  return deck;
}

function showDeck(deck) {
  if (user[deck] !== null) return;
  sound.play("open");
  user.target = deck;
  $("#btnChoose").disabled = false;
  $("#deck").classList.add("appear");
  tooltip.hide("slots");
  tooltip.show("drag");
  deckSwiper.slideTo(5, 0);
  deckSwiper.update(); // Bug fix?
  deckSwiper.update();
  deckSwiper.enable();
}

async function chooseCard() {
  if (!user.target) return;
  tooltip.hide("hold");
  sound.play("chosen", true);
  $("#btnChoose").disabled = true;
  user.decks.circle = generateDeck();
  user.decks.square = generateDeck();
  user.decks.triangle = generateDeck();
  user[user.target] = user.decks[user.target][deckSwiper.activeIndex];
  save(3);
  $("#deck").classList.remove("appear");
  $("#chosen").classList.remove("hide");
  // Animation when choosing the card
  await animate("#card-back", "wobble");
  await animate("#card-back", "flipOutY");
  sound.play("reveal");
  $("#card-back").classList.add("hide");
  $("#card-front").classList.remove("hide");
  await animate("#card-front", "flipInY");
  await animate("#card-front", "zoomOutUp");
  $("#card-front").classList.add("hide");
  $(`.slot.${[user.target]}`).classList.remove("pulse");
  $(`.slot.${[user.target]}`).classList.add("done");
  $(`.slot.${[user.target]}`).classList.add("float");
  tooltip.show("complete", "zoomInUp");
  await animate("#chosen", "fadeOut");
  $("#chosen").classList.add("hide");
  $("#card-back").classList.remove("hide");
  $("#btnChoose").disabled = false;
  // The three cards were choosen
  if (
    typeof user.triangle === "number" &&
    typeof user.square === "number" &&
    typeof user.circle === "number"
  ) {
    sound.play("alea-iacta-est");
    aleaIactaEst();
  }
}

function nextSlide() {
  swiper.allowSlideNext = true;
  swiper.slideNext(600);
  swiper.allowSlideNext = false;
}

function showAnswer() {
  if (!user.query || !user.answer) return;
  $(".query").innerText = user.query;
  $(".answer").innerText = user.answer;
  $("#btnShare").href = `http://localhost:3000/s/${user.id}`;
  localStorage.removeItem("user");
  user = defaultUser;
  swiper.allowSlideNext = true;
  swiper.slideNext(1400);
  swiper.allowSlideNext = false;
}

function aleaIactaEst() {
  tooltip.hide("complete", "zoomInUp");
  $("#background").classList.add("universe");
  setTimeout(async () => {
    const response = await fetch("http://localhost:3000/q", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: user.query,
        c: user.circle,
        t: user.triangle,
        s: user.square,
      }),
    });
    if (response.ok) {
      const spread = await response.json();
      user.id = spread.id;
      user.answer = spread.answer;
      save(5);
      swiper.allowSlideNext = true;
      swiper.slideNext(1400);
      swiper.allowSlideNext = false;
      setTimeout(() => {
        sound.play("the-answer");
      }, 6500);
      setTimeout(showAnswer, 7000);
    } else {
      console.error("Error:", response.status);
    }
  }, 3200);
}

function animate(element, animation, prefix = "animate__") {
  return new Promise((resolve) => {
    const animationName = `${prefix}${animation}`;
    const node = $(element);
    node.classList.add(`${prefix}animated`, animationName);
    function handleAnimationEnd(event) {
      event.stopPropagation();
      node.classList.remove(`${prefix}animated`, animationName);
      resolve("Animation ended");
    }
    node.addEventListener("animationend", handleAnimationEnd, { once: true });
  });
}

const sound = {
  context: null,
  files: null,
  playing: null,
  load: async function (files) {
    const loaded = {};
    const loadFiles = files.map(async (file) => {
      console.log(`Loading "sfx/${file}.ogg" ...`);
      const audioElement = new Audio();
      await new Promise((resolve) => {
        audioElement.addEventListener("canplaythrough", function () {
          loaded[file] = audioElement;
          resolve();
        });
        audioElement.src = `sfx/${file}.ogg`;
      });
    });
    await Promise.all(loadFiles);
    console.log("All sound files are loaded:", loaded);
    this.files = loaded;
  },
  stop: function () {
    if (this.playing) {
      this.playing.pause();
      this.playing.currentTime = 0;
    }
  },
  play: function (file, overlay = false) {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
    }
    const sfx = this.files[file];
    this.playing = sfx;
    if (sfx) {
      if (!sfx.sourceNode) {
        sfx.sourceNode = this.context.createMediaElementSource(sfx);
        sfx.sourceNode.connect(this.context.destination);
      }
      if (overlay) {
        const audioInstance = new Audio(sfx.src);
        audioInstance.addEventListener("ended", function () {
          this.remove();
        });
        audioInstance.play();
      } else {
        sfx.play();
      }
    } else {
      console.error(`El sonido "${file}" no se ha pre-cargado.`);
    }
  },
};

const image = {
  files: null,
  load: async function (files) {
    const loaded = {};
    const loadFiles = files.map(async (file) => {
      console.log(`Loading "img/${file}.webp" ...`);
      const imageElement = new Image();
      await new Promise((resolve) => {
        imageElement.addEventListener("load", function () {
          loaded[file] = imageElement;
          resolve();
        });
        imageElement.src = `img/${file}.webp`;
      });
    });
    await Promise.all(loadFiles);
    console.log("All image files are loaded:", loaded);
    this.files = loaded;
  },
  use: function (file) {
    return this.files[file];
  },
};

const tooltip = {
  show: function (name, animation = "zoomInDown", delay = 1000) {
    if (localStorage.getItem(`tooltip-${name}`)) return;
    setTimeout(async () => {
      $(`#tooltip-${name}`).classList.remove("hide");
      await animate(`#tooltip-${name}`, animation);
      $(`#tooltip-${name}`).classList.add("animated");
    }, delay);
  },
  hide: function (name, animation = "zoomOut", delay = 0) {
    setTimeout(async () => {
      $(`#tooltip-${name}`).classList.remove("animated");
      await animate(`#tooltip-${name}`, animation);
      $(`#tooltip-${name}`).classList.add("hide");
      localStorage.setItem(`tooltip-${name}`, 1);
    }, delay);
  },
};

const defaultUser = {
  decks: {
    triangle: null,
    square: null,
    circle: null,
  },
  query: null,
  target: null,
  timer: null,
  triangle: null,
  square: null,
  circle: null,
  slide: 0,
  id: null,
};

let user = JSON.parse(localStorage.getItem("user")) || defaultUser;

const swiper = new Swiper(".mySwiper", {
  speed: 600,
  parallax: true,
  allowSlideNext: false,
  allowSlidePrev: false,
  autoHeight: true,
  direction: "vertical",
  animating: false,
});

const deckSwiper = new Swiper(".mySwiperDeck", {
  effect: "cards",
  grabCursor: true,
  mousewheel: true,
  enabled: false,
  keyboard: true,
  initialSlide: 5,
});

deckSwiper.on("slideChange", function () {
  sound.play("shuffling");
  tooltip.hide("drag");
  tooltip.show("hold", "zoomInUp", 2000);
});

/*** Events */

$("#btnAsk").onclick = (e) => {
  e.preventDefault();
  $("#background").classList.add("universe");
  nextSlide();
};

$("textarea").onkeydown = (e) => {
  if (e.keyCode === 13) {
    e.preventDefault();
    const characters = e.target.value.length;
    if (characters > 20 && characters < 255) {
      drawYourCards();
    }
  }
};

$("textarea").oninput = (e) => {
  const characters = e.target.value.length;
  if (characters > 20 && characters < 255) {
    user.query = e.target.value;
    if ($("#btnDraw").classList.contains("disabled")) {
      $("#btnDraw").classList.remove("disabled");
      $("#btnDraw").classList.add("pulse");
    }
  } else {
    user.query = null;
    if (!$("#btnDraw").classList.contains("disabled")) {
      $("#btnDraw").classList.add("disabled");
      $("#btnDraw").classList.remove("pulse");
    }
  }
};

$("#btnDraw").onclick = (e) => {
  e.preventDefault();
  drawYourCards();
};

$("#btnShare").onclick = (e) => {
  e.preventDefault();
  navigator.clipboard
    .writeText(e.target.href)
    .then(() => {
      console.log("Texto copiado al portapapeles con éxito.");
    })
    .catch((err) => {
      console.error("Error al copiar al portapapeles:", err);
    });
};

$("#btnAskMeAgain").onclick = (e) => {
  e.preventDefault();
  swiper.allowSlidePrev = true;
  swiper.slideTo(1, 1000);
  swiper.allowSlidePrev = false;
};

$(".slot.triangle").onclick = () => {
  showDeck("triangle");
};

$(".slot.circle").onclick = () => {
  showDeck("circle");
};

$(".slot.square").onclick = () => {
  showDeck("square");
};

$(".slot.triangle").onmouseenter = (e) => {
  if (!e.target.classList.contains("done")) {
    sound.play("slot-hover");
  }
};

$(".slot.circle").onmouseenter = (e) => {
  if (!e.target.classList.contains("done")) {
    sound.play("slot-hover");
  }
};

$(".slot.square").onmouseenter = (e) => {
  if (!e.target.classList.contains("done")) {
    sound.play("slot-hover");
  }
};

$("#btnBack").onclick = () => {
  sound.play("close");
  $("#deck").classList.remove("appear");
  deckSwiper.disable();
};

$("#btnChoose").onmousedown = () => {
  sound.play("holding");
  user.timer = setTimeout(chooseCard, 1200);
};

$("#btnChoose").onmouseup = () => {
  sound.stop();
  clearTimeout(user.timer);
};

$("#btnChoose").ontouchstart = () => {
  user.timer = setTimeout(chooseCard, 1200);
};

$("#btnChoose").ontouchend = () => {
  clearTimeout(user.timer);
};

window.addEventListener("load", async () => {
  await sound.load([
    "the-answer",
    "alea-iacta-est",
    "reveal",
    "open",
    "close",
    "chosen",
    "holding",
    "shuffling",
    "slot-hover",
  ]);
  await image.load(["background-default", "background-stars"]);
  animate("#loader .icon", "backOutDown");
  animate(".curtain.left", "fadeOutLeft");
  await animate(".curtain.right", "fadeOutRight");
  $("#loader").classList.add("hide");
  if (user.slide) {
    restore();
  }
});
