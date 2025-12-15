const button = document.getElementById("action-btn");
const output = document.getElementById("output");

function getGreeting() {
  const now = new Date();
  const hours = now.getHours();
  if (hours < 12) return "G?nayd?n!";
  if (hours < 18) return "?yi g?nler!";
  return "?yi ak?amlar!";
}

button?.addEventListener("click", () => {
  const message = ${getGreeting()} JavaScript ?al???yor.;
  output.textContent = message;
});
