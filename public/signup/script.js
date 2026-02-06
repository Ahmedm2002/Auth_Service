const userName = document.getElementById("name");
const email = document.getElementById("email");
const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");
const signupRes = document.getElementById("signupRes");

async function signup(event) {
  event.preventDefault();

  signupRes.style.display = "none";
  signupRes.className = "signup-response";

  if (
    !userName.value ||
    !email.value ||
    !password.value ||
    !confirmPassword.value
  ) {
    showError("Please enter all the details");
    return;
  }

  if (password.value.trim() !== confirmPassword.value.trim()) {
    showError("Passwords must match");
    return;
  }

  try {
    let response = await fetch("/api/v1/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.value,
        password: password.value,
        name: userName.value,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.message || "Signup failed");
      return;
    }

    showSuccess(
      "Account created successfully. Redirecting to email verification…"
    );

    setTimeout(() => {
      sessionStorage.setItem(
        "user",
        JSON.stringify({
          name: data.data.name,
          email: data.data.email,
        })
      );
      window.location.href = "/verify-email";
    }, 2000);
  } catch (error) {
    showError("Something went wrong. Please try again.");
  }
}

function showError(message) {
  signupRes.innerText = message;
  signupRes.classList.add("error");
  signupRes.style.display = "block";
}

function showSuccess(message) {
  signupRes.innerText = message;
  signupRes.classList.add("success");
  signupRes.style.display = "block";
}
