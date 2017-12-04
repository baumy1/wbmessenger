var socket = io();
var audio = new Audio('https://cdn.glitch.com/b4fe921b-f672-42a9-b674-e090293609f3%2F377017__elmasmalo1__notification-pop.wav?1509966175430');

var socketId;
var chat = "group";
getMessages(chat);

// Send message
$('.messageForm').submit(function(event) {
  event.preventDefault();
  var messageContent = $('.message-text').val().trim();
  if (messageContent == "") {
    return;
  }
  
   $(".main").append("<div class='message " + username + "'><img src='https://wbmessenger.glitch.me/" + username + ".jpg'><div class='text'><p class='name'>" + firstname + "</p><p class='message-content'>" + messageContent + "</p></div></div>");
    // Scroll to bottom
  window.scrollTo(0,document.body.scrollHeight);
  
  $.post('/newmessage', { messageContent: messageContent, time: new Date().getTime(), chat: chat }, function() {
    console.log("Sent: " + messageContent);
  });
  
  $('.message-text').val('');
  $('.message-text').focus();
});

// Get Messages
function getMessages(name) {
  $.post('/getmessages', {chat: chat}, function(data) {
  $(".main").html(data.htmlMessages);
  $(".chatName").html(data.name);
    
  // Scroll to bottom
  window.scrollTo(0,document.body.scrollHeight);
  }); 
}

// Socket functions
socket.on('groupmessage',
        function(data) {
            if (username != data.from.username) {
              audio.play();
            }
  
            if (chat == "group" && data.from.username != username) {
              $(".main").append("<div class='message " + data.from.username + "'><img src='https://wbmessenger.glitch.me/" + data.from.username + ".jpg'><div class='text'><p class='name'>" + data.from.firstname + "</p><p class='message-content'>" + data.message + "</p></div></div>");
            }
    
            window.scrollTo(0,document.body.scrollHeight); 
        }
    );

socket.on('block',
        function(data) {
            if (data == username) {
              window.location.href = "/";
            }   
        }
    );

socket.on('message',
        function(data) {

            if (chat !== data.from.username || document.hidden) {
              audio.play();
            }
  
            if (chat == data.from.username) {
              $(".main").append("<div class='message " + data.from.username + "'><img src='https://wbmessenger.glitch.me/" + data.from.username + ".jpg'><div class='text'><p class='name'>" + data.from.firstname + "</p><p class='message-content'>" + data.message + "</p></div></div>");
            }  
        }
    );

socket.on('id',
        function(data) {
          var socketId = data;
          $.post('/setId', {socketId: data}, function(data) {console.log("Sent ID: " + socketId)});
});

// Change chats
$(".nav-link").click(function (event) {
  event.preventDefault();
  
  $(".nav-link").removeClass("active");
  $(this).addClass("active");
  
  chat = $(this).attr('id');
  
  getMessages(chat);
  
})