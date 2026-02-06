const userName = document.getElementById("userName");
const email = document.getElementById("userEmail");
const verifyMailBtn = document.getElementById("verifyMailBtn");
const resendBtn = document.getElementById("resendBtn");
const otpInputsDiv = document.getElementsByClassName("otp-inputs");
const code1 = document.getElementById("code1");
const code2 = document.getElementById("code2");
const code3 = document.getElementById("code3");
const code4 = document.getElementById("code4");
let user;
(() => {
  user = JSON.parse(sessionStorage.getItem("user"));
  if (!user || !user.name || !user.email) {
    window.location.href = "/signup";
  }
  userName.innerText = user.name;
  email.innerText = user.email;
})();

async function verifyEmail(event) {
  event.preventDefault();
  if (!code1.value || !code2.value || !code3.value || !code4.value) {
    alert("Please enter complete code");
    return;
  }
  const completeCode = code1.value + code2.value + code3.value + code4.value;
  let response = await fetch("/api/v1/verify/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      code: completeCode,
    }),
  });

  response = await response.json();
  console.log(response);
}
