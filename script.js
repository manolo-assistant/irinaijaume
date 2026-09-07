const weddingDate = new Date("2026-09-25T19:00:00+02:00");
const countdown = document.querySelector("#countdown");
const daysElement = document.querySelector("#days");
const hoursElement = document.querySelector("#hours");
const minutesElement = document.querySelector("#minutes");

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
