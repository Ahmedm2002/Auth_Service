const userName = document.getElementById("user-name");
const email = document.getElementById("user-email");
(() => {
  console.log("window: ", window);
  const params = new URLSearchParams(window.location.search);
  userName.innerText = params.get("name");
  email.innerText = params.get("email");
})();

function verifyEmail(event) {
  event.preventDefault();
}
