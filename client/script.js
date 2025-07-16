document.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  const joinRoomBtn = document.getElementById("joinRoom");
  const localVideo = document.getElementById("localVideo");
  const remoteVideo = document.getElementById("remoteVideo");
  const toggleVideoBtn = document.getElementById("toggleVideo");
  const toggleAudioBtn = document.getElementById("toggleAudio");
  const shareScreenBtn = document.getElementById("shareScreen");
  const sendMessageBtn = document.getElementById("sendMessage");
  const messageInput = document.getElementById("messageInput");
  const messagesBox = document.getElementById("messages");
  const fileInput = document.getElementById("fileInput");
  const sendFileBtn = document.getElementById("sendFile");
  const leaveRoomBtn = document.getElementById("leaveRoom");

  let localStream;
  let peerConnection;
  let videoEnabled = true;
  let audioEnabled = true;

  const config = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }
    ]
  };

  if (localVideo) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localStream = stream;
        localVideo.srcObject = stream;
      })
      .catch(error => console.error("Media error:", error));
  }

  if (joinRoomBtn) {
    joinRoomBtn.addEventListener("click", () => {
      const room = document.getElementById("roomInput").value;
      const password = document.getElementById("roomPassword").value;
      if (room && password) {
        socket.emit("join-room", { room, password });
        localStorage.setItem("roomId", room);
        window.location.href = "/room";
      } else {
        alert("Please enter both Room ID and Password.");
      }
    });
  }

  if (leaveRoomBtn) {
    leaveRoomBtn.addEventListener("click", () => {
      window.location.href = "/";
    });
  }

  socket.on("user-joined", () => {
    createOffer();
  });

  socket.on("offer", async (offer) => {
    createPeerConnection();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", answer);
  });

  socket.on("answer", async (answer) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  });

  socket.on("ice-candidate", async (candidate) => {
    try {
      await peerConnection.addIceCandidate(candidate);
    } catch (err) {
      console.error("ICE error:", err);
    }
  });

  function createPeerConnection() {
    peerConnection = new RTCPeerConnection(config);

    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = event => {
      if (remoteVideo) {
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.style.display = "block";
      }
    };

    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        socket.emit("ice-candidate", event.candidate);
      }
    };
  }

  async function createOffer() {
    createPeerConnection();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", offer);
  }

  if (toggleVideoBtn) {
    toggleVideoBtn.addEventListener("click", () => {
      videoEnabled = !videoEnabled;
      localStream.getVideoTracks()[0].enabled = videoEnabled;
      toggleVideoBtn.textContent = videoEnabled ? "Turn Video Off" : "Turn Video On";
    });
  }

  if (toggleAudioBtn) {
    toggleAudioBtn.addEventListener("click", () => {
      audioEnabled = !audioEnabled;
      localStream.getAudioTracks()[0].enabled = audioEnabled;
      toggleAudioBtn.textContent = audioEnabled ? "Mute" : "Unmute";
    });
  }

  if (shareScreenBtn) {
    shareScreenBtn.addEventListener("click", async () => {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnection.getSenders().find(s => s.track.kind === "video");
        sender.replaceTrack(videoTrack);
        localVideo.srcObject = screenStream;
      } catch (error) {
        console.error("Screen share error:", error);
      }
    });
  }

  if (sendMessageBtn) {
    sendMessageBtn.addEventListener("click", () => {
      const message = messageInput.value;
      if (message.trim()) {
        socket.emit("message", message);
        addMessage("Me", message);
        messageInput.value = "";
      }
    });
  }

  socket.on("createMessage", (msg) => {
    addMessage("User", msg);
  });

  function addMessage(sender, text) {
    const div = document.createElement("div");
    div.textContent = `${sender}: ${text}`;
    messagesBox.appendChild(div);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  if (sendFileBtn) {
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
  }

  socket.on("file", (data) => {
    const link = document.createElement("a");
    link.href = data.fileData;
    link.download = data.fileName;
    link.textContent = `Download ${data.fileName}`;
    messagesBox.appendChild(link);
    messagesBox.appendChild(document.createElement("br"));
  });
});
