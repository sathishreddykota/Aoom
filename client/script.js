const socket = io();

const localVideo = document.getElementById("localVideo");
const joinRoomBtn = document.getElementById("joinRoom");
const toggleVideoBtn = document.getElementById("toggleVideo");
const toggleAudioBtn = document.getElementById("toggleAudio");
const shareScreenBtn = document.getElementById("shareScreen");
const sendMessageBtn = document.getElementById("sendMessage");
const messageInput = document.getElementById("messageInput");
const messagesBox = document.getElementById("messages");
const fileInput = document.getElementById("fileInput");
const sendFileBtn = document.getElementById("sendFile");

let localStream;
let videoEnabled = true;
let audioEnabled = true;

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    localVideo.srcObject = stream;
  })
  .catch(error => console.error("Media error:", error));

joinRoomBtn.addEventListener("click", () => {
  const room = document.getElementById("roomInput").value;
  const password = document.getElementById("roomPassword").value;
  if (room && password) {
    socket.emit("join-room", { room, password });
  }
});

toggleVideoBtn.addEventListener("click", () => {
  videoEnabled = !videoEnabled;
  localStream.getVideoTracks()[0].enabled = videoEnabled;
  toggleVideoBtn.textContent = videoEnabled ? "Turn Video Off" : "Turn Video On";
});

toggleAudioBtn.addEventListener("click", () => {
  audioEnabled = !audioEnabled;
  localStream.getAudioTracks()[0].enabled = audioEnabled;
  toggleAudioBtn.textContent = audioEnabled ? "Mute" : "Unmute";
});

shareScreenBtn.addEventListener("click", async () => {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const videoTrack = screenStream.getVideoTracks()[0];
    const sender = localStream.getVideoTracks()[0];
    localStream.removeTrack(sender);
    localStream.addTrack(videoTrack);
    localVideo.srcObject = screenStream;
  } catch (error) {
    console.error("Screen share error:", error);
  }
});

sendMessageBtn.addEventListener("click", () => {
  const message = messageInput.value;
  if (message.trim()) {
    socket.emit("message", message);
    addMessage("Me", message);
    messageInput.value = "";
  }
});

socket.on("createMessage", (msg) => {
  addMessage("User", msg);
});

function addMessage(sender, text) {
  const div = document.createElement("div");
  div.textContent = `${sender}: ${text}`;
  messagesBox.appendChild(div);
  messagesBox.scrollTop = messagesBox.scrollHeight;
}

sendFileBtn.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      socket.emit("file", { fileName: file.name, fileData: reader.result });
    };
    reader.readAsDataURL(file);
  }
});

socket.on("file", (data) => {
  const link = document.createElement("a");
  link.href = data.fileData;
  link.download = data.fileName;
  link.textContent = `Download ${data.fileName}`;
  messagesBox.appendChild(link);
  messagesBox.appendChild(document.createElement("br"));
});
