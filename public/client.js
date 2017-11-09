var socket = io();
var audio = new Audio('https://cdn.glitch.com/b4fe921b-f672-42a9-b674-e090293609f3%2F377017__elmasmalo1__notification-pop.wav?1509966175430');

// Get messages
$.post('/getgroup', function(data) {
   $(".main").append(data);
  
  // Scroll to bottom
  window.scrollTo(0,document.body.scrollHeight);
  });

// Send message
$('.messageForm').submit(function(event) {
  event.preventDefault();
  var messageContent = $('.message-text').val().trim();
  if (messageContent == "") {
    return;
  }
  $.post('/newmessage', { messageContent: messageContent, time: new Date().getTime() }, function() {
    console.log("Sent: " + messageContent);
  });
  $('.message-text').val('');
  $('.message-text').focus();
});


// Socket functions
socket.on('groupmessage',
        function(data) {
            if (username != data.from.username) {
              audio.play();
            }
            $(".main").append("<div class='message " + data.from.username + "'><img src='https://wbmessenger.glitch.me/" + data.from.username + ".jpg'><div class='text'><p class='name'>" + data.from.firstname + "</p><p class='message-content'>" + data.message + "</p></div></div>");
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