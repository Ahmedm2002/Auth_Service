let userName = document.getElementById("name");
let email = document.getElementById("email");
let password = document.getElementById("password");
let confirmPassword = document.getElementById("confirmPassword");
let emailExists = document.getElementById("emailExists");
let serverError = document.getElementById("serverError");
let registrationSuccess = document.getElementById("registrationSuccess");
let invalidInputs = document.getElementById("invalidInputs");

async function signup(event) {
  event.preventDefault();
  emailExists.style.display = "none";
  serverError.style.display = "none";
  invalidInputs.style.display = "none";
  registrationSuccess.style.display = "none";

  if (
    !userName.value ||
    !password.value ||
    !email.value ||
    !confirmPassword.value
  ) {
    alert("Please enter all the details");
    return;
  }
  if (password.value.trim() !== confirmPassword.value.trim()) {
    alert("Passwords must match");
    return;
  }
  let response = await fetch("/api/v1/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.value,
      password: password.value,
      name: userName.value,
    }),
  });
  response = await response.json();
  console.log("Json Response: ", response);
  if (response.status === 409 || response.statusCode === 409) {
    emailExists.style.display = "block";
    return;
  }
  if (response.status === 400 || response.statusCode === 400) {
    invalidInputs.style.display = "block";
    return;
  }
  if (response.status === 500 || response.statusCode === 500) {
    serverError.style.display = "block";
    return;
  }
  if (response.status === 200 || response.statusCode === 200) {
    registrationSuccess.style.display = "block";
    setTimeout(() => {
      window.location.href = `/verify-email?name=${response.data.name}&email=${response.data.email}`;
    }, 2000);
    return;
  }
}

// {
//   "email": "ahmedmujtaba0129@gmail.com",
//   "password": "pasassword123@",
//   "name" : "Ahmed Mujtaba"
// }
