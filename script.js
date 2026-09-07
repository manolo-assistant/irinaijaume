const translations = {
  ca: {
    skip: "Vés als detalls del casament",
    wedding: "Ens casem!",
    dateFirst: "Divendres, vint-i-cinc de setembre",
    dateSecond: "de dos mil vint-i-sis",
    time: "A les set del vespre",
    days: "Dies",
    hours: "Hores",
    minutes: "Minuts",
    calendar: "Afegeix al calendari",
    details: "Detalls del casament",
    countdown: "Compte enrere per al casament",
    footer: "Irina & Jaume · 25 de setembre de 2026",
    top: "Torna a dalt",
  },
  es: {
    skip: "Ir a los detalles de la boda",
    wedding: "¡Nos casamos!",
    dateFirst: "Viernes, veinticinco de septiembre",
    dateSecond: "de dos mil veintiséis",
    time: "A las siete de la tarde",
    days: "Días",
    hours: "Horas",
    minutes: "Minutos",
    calendar: "Añadir al calendario",
    details: "Detalles de la boda",
    countdown: "Cuenta atrás para la boda",
    footer: "Irina & Jaume · 25 de septiembre de 2026",
    top: "Volver arriba",
  },
  en: {
    skip: "Skip to the wedding details",
    wedding: "Our wedding",
    dateFirst: "Friday, the twenty-fifth of September",
    dateSecond: "two thousand and twenty-six",
    time: "Seven o’clock in the evening",
    days: "Days",
    hours: "Hours",
    minutes: "Minutes",
    calendar: "Add to your calendar",
    details: "Wedding details",
    countdown: "Countdown to the wedding",
    footer: "Irina & Jaume · 25 September 2026",
    top: "Back to the top",
  },
};

const languageButtons = document.querySelectorAll("[data-language]");
const languageContents = document.querySelectorAll("[data-language-content]");

function preferredLanguage() {
  const queryLanguage = new URLSearchParams(window.location.search).get("lang");
  if (translations[queryLanguage]) return queryLanguage;
  return "ca";
}

function setLanguage(language, updateUrl = true) {
  const selectedLanguage = translations[language] ? language : "en";
  const strings = translations[selectedLanguage];

  document.documentElement.lang = selectedLanguage;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (strings[key]) element.textContent = strings[key];
  });

  countdown.setAttribute("aria-label", strings.countdown);

  languageButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.language === selectedLanguage));
  });

  languageContents.forEach((content) => {
    content.hidden = content.dataset.languageContent !== selectedLanguage;
  });

  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", selectedLanguage);
    window.history.replaceState(null, "", url);
  }
}

languageButtons.forEach((button) => {
  button.addEventListener("click", () => setLanguage(button.dataset.language));
});

const weddingDate = new Date("2026-09-25T19:00:00+02:00");
const countdown = document.querySelector("#countdown");
const daysElement = document.querySelector("#days");
const hoursElement = document.querySelector("#hours");
const minutesElement = document.querySelector("#minutes");

setLanguage(preferredLanguage(), false);

function updateCountdown() {
  const difference = weddingDate.getTime() - Date.now();

  if (difference <= 0) {
    countdown.hidden = true;
    return;
  }

  daysElement.textContent = Math.floor(difference / 86_400_000);
  hoursElement.textContent = Math.floor((difference % 86_400_000) / 3_600_000);
  minutesElement.textContent = Math.floor((difference % 3_600_000) / 60_000);
}

updateCountdown();
window.setInterval(updateCountdown, 30_000);
