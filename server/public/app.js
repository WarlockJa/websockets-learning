const socket = io("ws://localhost:3500");

const activity = document.querySelector(".activity");
const msgInput = document.querySelector("input");

function sendMessage(e) {
  e.preventDefault();
  if (msgInput.value) {
    // sending message via socket.io
    socket.emit("message", msgInput.value);
    msgInput.value = "";
  }
  msgInput.focus();
}

document.querySelector("form").addEventListener("submit", sendMessage);

// listening for the server messages
socket.on("message", (data) => {
  // removing typing notification on message received
  activity.textContent = "";
  const li = document.createElement("li");
  li.textContent = data;
  document.querySelector("ul").append(li);
});

// listening to the input keypress event and sending "typing" activity with socket.io
msgInput.addEventListener("keypress", () => {
  socket.emit("activity", socket.id.substring(0, 5));
});

// activity listener for the user from the server
let activityTimer;
socket.on("activity", (name) => {
  activity.textContent = `${name} is typing...`;

  // Clear after 1 second
  clearTimeout(activityTimer);
  activityTimer = setTimeout(() => {
    activity.textContent = "";
  }, 1000);
});
