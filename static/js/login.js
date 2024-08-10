const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');

signUpButton.addEventListener('click', () => {
  container.classList.add("right-panel-active");
});

signInButton.addEventListener('click', () => {
  container.classList.remove("right-panel-active");
});

const signUpForm = document.querySelector('.sign-up-container form');

signUpForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const password = signUpForm.querySelector('input[name="password"]').value;
  const confirmPassword = signUpForm.querySelector('input[name="confirm_password"]').value;

  if (password !== confirmPassword) {
    alert('Passwords do not match');
    return;
  }

  signUpForm.submit();
});