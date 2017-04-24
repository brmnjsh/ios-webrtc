var Presentation = (function() {
	function Presentation(socketUrl,page,doc,canvas,channel,user,userId,userRole,taskType,onLoadCallback){
		if(!Presentation.instance){
			Presentation.instance = this
			Presentation.instance.ws = new WebSocket(socketUrl)
			Presentation.instance.p = page
			Presentation.instance.doc = doc
			Presentation.instance.canvas = canvas
			Presentation.instance.num_pages = 0
			Presentation.instance.channel = channel
			Presentation.instance.user = user
			Presentation.instance.userId = userId
			Presentation.instance.userRole = userRole
			Presentation.instance.taskType = taskType
			if (typeof(onLoadCallback) == 'function'){
				Presentation.instance.onLoadCallback = onLoadCallback
			} else {
				Presentation.instance.onLoadCallback = null
			}
			if (typeof(canvas)=='object'){
				Presentation.instance.isMultipleCanvas = true
			} else {
				Presentation.instance.isMultipleCanvas = false
			}
			Presentation.instance.connect()
		}
		return Presentation.instance
	}

	//set up the Presentation object, and connect to the server...sets up listeners (may move these out into own methods)
	Presentation.prototype.connect = function() {
		if ("WebSocket" in window && Presentation.instance.taskType != 1) {
			PDFJS.getDocument(Presentation.instance.doc).then(function(pdf) {
		    Presentation.instance.pdf = pdf
				Presentation.instance.num_pages = Presentation.instance.pdf.numPages
				Presentation.instance.get_page()
		    //Presentation.instance.change_page(Presentation.instance.p,Presentation.instance.pdf)
		  })
			Presentation.instance.ws.onopen = function() {
				console.log("websocket is connected ")
				var send = {
					"sentFrom": {
						"id":			Presentation.instance.userId,
						"name": 	Presentation.instance.user,
						"role": 	Presentation.instance.userRole
					},
					"sendType": {
						"process":		"connect",
						"channel":		Presentation.instance.channel
					}
				}
 				Presentation.instance.send(send)
			}

			Presentation.instance.ws.onmessage = function (evt) {
				var p = parseInt(evt.data);
				//console.log('page change or start: ' + p);
				Presentation.instance.change_page(p, Presentation.instance.pdf)
			 	Presentation.instance.p = p
			}

			Presentation.instance.ws.onclose = function() {
			 	console.log("Connection is closed...")
			}
		} else if (Presentation.instance.taskType == 1) {
			PDFJS.getDocument(Presentation.instance.doc).then(function(pdf) {
		    Presentation.instance.pdf = pdf
				Presentation.instance.num_pages = Presentation.instance.pdf.numPages
				Presentation.instance.change_page(1, Presentation.instance.pdf)
				Presentation.instance.p = 1
		    //Presentation.instance.change_page(Presentation.instance.p,Presentation.instance.pdf)
		  })
		} else {
			console.log("ERROR: WebSocket NOT supported by your Browser!")
		}
	}

	Presentation.prototype.send = function(msg) {
		Presentation.instance.ws.send(JSON.stringify(msg))
	}

	Presentation.prototype.get_page = function() {
		var send = {
			"sentFrom": {
				"id":			Presentation.instance.userId,
				"name": 	Presentation.instance.user,
				"role": 	Presentation.instance.userRole
			},
			"sendType": {
				"process":		"getPage",
				"channel":		Presentation.instance.channel
			}
		}
		Presentation.instance.send(send)
		
	}

	//when page is chagned, sends number to server, server then resonods to all others
	Presentation.prototype.change_page = function(p, pdf) {
    pdf.getPage(p).then(function(page) {
      // you can now use *page* here
      var desiredWidth = 100
      var viewport = page.getViewport(1)
      var scale = desiredWidth / viewport.width
      //var scaledViewport = page.getViewport(scale)
			var idx = null
			if (Presentation.instance.isMultipleCanvas) {
				for(idx in Presentation.instance.canvas){
					var canvas = Presentation.instance.canvas[idx]
					var context = canvas.getContext('2d')
					canvas.height = viewport.height
					canvas.width = viewport.width
					$(canvas).data('viewportWidth',viewport.width);
					var renderContext = {
						canvasContext: context,
						viewport: viewport
					}
					page.render(renderContext)
				}
			} else {
				var canvas = Presentation.instance.canvas
				var context = canvas.getContext('2d')
				canvas.height = viewport.height
				canvas.width = viewport.width
				$(canvas).data('viewportWidth',viewport.width);
				var renderContext = {
					canvasContext: context,
					viewport: viewport
				}
				page.render(renderContext)
			}
			if (Presentation.instance.onLoadCallback != null){
				Presentation.instance.onLoadCallback();
			}
    })
  }
	return Presentation;
})();

var Chat = (function() {
  function Chat(count, user_id, sendbird_nickname, user_image, init_channel, message_list, message_container, chat_box, user_box, notice_badge){
		//only allow for one instance of chat
  	if(!Chat.instance){
			Chat.instance = this
			Chat.instance.success = " - Chat instance initialized..."
			Chat.instance.notification = 0
			Chat.instance.channel_id = 0
			Chat.instance.channel_url = ''
			Chat.instance.typing = 0
			Chat.instance.init_channel = init_channel
			Chat.instance.message_list = message_list
			Chat.instance.message_container = message_container
			Chat.instance.chat_box = chat_box
			Chat.instance.user_box = user_box
			Chat.instance.notice_badge = notice_badge
			Chat.instance.guest_user = ''
			console.log(c++ + " - Chat instance initializing...")
			Chat.instance.user_id = window.location.host + '.' + user_id
			Chat.instance.sendbird_nickname = sendbird_nickname

			if (user_image != '') {
				Chat.instance.user_image = user_image
			} else {
				Chat.instance.user_image = '../img/img-default-profile.png'
			}

			//console.log(Chat.instance.init_channel)
			Chat.instance.guest_image = '../img/img-default-profile.png'
			Chat.instance.login(Chat.instance.user_id, Chat.instance.sendbird_nickname)

  	}
  	return Chat.instance
  }

//-----------------channel management-------------//
	Chat.prototype.login = function(id, name) {
		sendbird.init({
			"app_id": "434F19D5-92F4-4E2D-9BB3-E7B6F7E509A3",
			"guest_id": id,
			"user_name": name,
			"image_url": '',
			"access_token": '',
			"successFunc": function(data) {
				Chat.instance.join_channel(Chat.instance.init_channel)
			},
			"errorFunc": function(status, error) {
				console.log(status, error)
			}
		})
	}

	Chat.prototype.join_channel = function(channel) {
		sendbird.joinChannel(
			channel,
			{
				"successFunc" : function(data) {
					Chat.instance.channel_id = data['id']
					sendbird.connect({
						"successFunc" : function(data) {
							Chat.instance.chat_status(true)
							Chat.instance.receiver()
							Chat.instance.get_prev_messages()
							Chat.instance.typing_start()
							Chat.instance.typing_end()
							Chat.instance.channel_update()
							Chat.instance.mark_as_read()
						},
						"errorFunc": function(status, error) {
							console.log(status, error)
						}
					})
				},
				"errorFunc": function(status, error) {
					console.log(status, error)
				}
			}
		)
		console.log(c++ + ' - User login succeeded')
	}

	Chat.prototype.channel_update = function() {
		sendbird.events.onMessagingChannelUpdateReceived = function(obj) {
			if (Chat.instance.channel_id == obj['channel']['id']) {
			} else {
				Chat.instance.notice_badge.addClass('msg-notify')
				Chat.instance.notice_badge.html(++Chat.instance.notification)
				var message = obj
				$.each(obj['members'], function(k,v) {
					var guest = v
					$.each($('.chat-user-wrap'), function(a,b) {
						if ($(b).attr('data-guest-id') == guest['guest_id']) {
							$(b).find('.online_indicator').html(message['unread_message_count'])
						}
					})
				})
			}
		}
	}

	Chat.prototype.channel_disconnect = function(channel) {
		sendbird.leaveChannel(
			channel,
			{
				"successFunc" : function(data) {
					//console.log(data)
				},
				"errorFunc": function(status, error) {
					console.log(status, error)
				}
			}
		);
	}

	Chat.prototype.oneonone = function(guest) {
		var guest = guest
		sendbird.startMessaging(
			[guest],
			{
				"successFunc" : function(data) {
					//console.log(data)
					Chat.instance.channel_url = data['channel']['channel_url']
					Chat.instance.channel_id = data['channel']['id']
					Chat.instance.guest_user = guest
					sendbird.connect({
						"successFunc" : function(data, messages) {
							Chat.instance.message_list.html('')
							Chat.instance.receiver()
							Chat.instance.get_prev_messages()
							Chat.instance.typing_start()
							Chat.instance.typing_end()
							Chat.instance.channel_update()
							Chat.instance.mark_as_read()
						},
						"errorFunc": function(status, error) {
							console.log(status, error)
						}
					});
				},
				"errorFunc": function(status, error) {
					console.log('id of guest: ' + guest)
					console.log(status, error)
				}
			}
		)
	}

	Chat.prototype.receiver = function() {
		sendbird.events.onMessageReceived = function(obj) {
			//console.log(obj)
			if (obj['channel_id'] == Chat.instance.channel_id) {
				Chat.instance.add_message_to_chat(obj)
				Chat.instance.mark_as_read()
			} else {
				//add to notice badge
				//add to user notice badge
				//Chat.instance.notice_badge.addClass('msg-notify')
				//Chat.instance.notice_badge.html(++Chat.instance.notification)
			}
		}
	}

	Chat.prototype.check_if_user_in_chat = function(chat_user, current_user) {
		if (chat_user == current_user) {
			return true
		}
		return false
	}

//-----------------message management-------------//
	Chat.prototype.get_unread = function() {
		sendbird.getMessagingChannelListPagination({
			"successFunc" : function(data) {
				var notice_count = 0
				$.each(data['channels'], function(k,v) {
					var channel = v
					//console.log(channel)
					if (channel['unread_message_count'] > 0 && channel['channel_type'] == 5) {
						Chat.instance.notice_badge.addClass('msg-notify')
						$.each(v['members'], function(k,v) {
							$.each($('.chat-user-wrap'), function(a,b) {
								if ($(b).attr('data-guest-id') == v['guest_id'] && v['guest_id'] != Chat.instance.user_id) {
									$(b).find('.online_indicator').html(channel['unread_message_count'])
									$(b).find('.online_indicator').attr('data-notice-count', channel['unread_message_count'])
									notice_count = notice_count + channel['unread_message_count']
									//console.log(channel)
								}
							})
						})
					}
				})
				Chat.instance.notice_badge.html(notice_count)
				Chat.instance.notice_badge.attr('data-notice-count', notice_count)
				Chat.instance.notification = notice_count
			},
			"errorFunc": function(status, error) {
				console.log(status, error);
				// do something
			}
		});
	}

	Chat.prototype.add_message_to_chat = function(obj) {
		var d = new Date(obj['sts'])
		if (obj['user']['guest_id'] == Chat.instance.get_user()) {
			var message = '<li class="chat-message-self chat-messages"><div class="chat-message-wrap">'
			message += '<h3 class="chat-message-user">'+Chat.instance.sendbird_nickname+' (you)' + '</h3>'
		} else {
			var message = '<li class="chat-message-other chat-messages"><div class="chat-message-wrap">'
			message += '<h3 class="chat-message-user">'+obj['user']['name']+'</h3>'
		}
			message += '<p class="chat-message-content">' + obj['message'] + '</p>'
			//message += '<hr>'
			//message += '<p class="chat-message-time">' + d + '</p>'
		message += '</div></li>'
		Chat.instance.message_list.append(message);
		Chat.instance.message_list.animate({ scrollTop: Chat.instance.message_list[0].scrollHeight}, 0);
	}

	Chat.prototype.send_message = function(message) {
		if (Chat.instance.chat_box.val() != '') {
			sendbird.message(message)
			Chat.instance.chat_box.val('')
		}
	}

	Chat.prototype.mark_as_read = function() {
		sendbird.markAsRead(Chat.instance.channel_url);
	}

//-----------------typing management-------------//
	Chat.prototype.typing_start = function() {
		sendbird.events.onTypeStartReceived = function(obj) {
			if (Chat.instance.channel_id == obj['channel_id'] && Chat.instance.user_id != obj['user']['guest_id'] && Chat.instance.typing == 0) {
				//console.log(obj)
				Chat.instance.typing = 1
				var d = new Date(obj['sts'])
				var message = '<li class="chat-message-other chat-messages typing-indicator"><div class="chat-message-wrap">'
				message += '<h3 class="chat-message-user">'+obj['user']['name']+'</h3>'
				message += '<p class="chat-message-content"><span class="typing-text">' + 'user is typing' + '</span><span class="typing-text dots"></span></p>'
				//message += '<hr>'
				//message += '<p class="chat-message-time">' + d + '</p>'
				message += '</div></li>'
				$('.typing-indicator').remove()
				Chat.instance.message_list.append(message);
				Chat.instance.message_list.animate({ scrollTop: Chat.instance.message_list[0].scrollHeight}, 0);
				window.setTimeout(Chat.instance.typing_dots, 500)
				Chat.instance.typing_dots(1)
			}
		}
	}

	Chat.prototype.typing_end = function() {
		sendbird.events.onTypeEndReceived = function(obj) {
			Chat.instance.typing = 0
			$('.typing-indicator').remove()
		}
	}

	Chat.prototype.typing_dots = function(count) {
		if (Chat.instance.typing == 1 && count <= 3) {
			$('.dots').append('.')
			count = count + 1
			setTimeout(function() {Chat.instance.typing_dots(count)}, 500)
		} else if (Chat.instance.typing == 1 && count >= 3) {
			$('.dots').delay(500).empty()
			setTimeout(function() {Chat.instance.typing_dots(1)}, 500)
		}
	}

	Chat.prototype.chat_status = function(init) {
		// if (init == null || init == '' || init == 'undefined') {
		// 	init = false
		// }
		init = true
		var tempScrollTop = $('.chat-users').scrollTop();
		sendbird.getMemberList(
			Chat.instance.init_channel,{
				"successFunc" : function(data, date) {
					if (init == true) {
						window.users_status = {chatInstance: Chat.instance, users: data['members']}
						$.getScript('/js/includes/chatjs/templates/e58fb.consultancymeeting.js', function(){
							Chat.instance.user_box.html(window.users_status)
							$('.chat-users').scrollTop(tempScrollTop)
							Chat.instance.get_unread()
						})
					} else {
						//for (var idx user of data['members']) {
						data['members'].forEach(function(user){
							if (user['guest_id'] != Chat.instance.get_user()) {
								var guest = $('.chat-user-wrap').data('guest-id', user['guest_id'])
								if (user['is_online'] == false) {
									guest.find('.online_indicator').removeClass('is_online')
									guest.find('.chat-user-img').removeClass('is_online')
								} else {
									guest.find('.online_indicator').addClass('is_online')
									guest.find('.chat-user-img').addClass('is_online')
								}
							}
						});
					}
				},
				"errorFunc": function(status, error) {
					console.log(status, error)
				}
			}
		)
	}

//-----------------getter/setters management-------------//

	Chat.prototype.imageExists = function(image_url){
		var http = new XMLHttpRequest();
		http.open('HEAD', image_url, false);
		http.send();
		return http.status != 404;
	}

	Chat.prototype.get_user = function() {
		return Chat.instance.user_id
	}

	Chat.prototype.get_prev_messages = function() {
		sendbird.getMessageLoadMore({
			"limit": 50,
			"successFunc" : function(data) {
				for (var i = data['messages'].length; i--;) {
					Chat.instance.add_message_to_chat(data['messages'][i]['payload'])
				}
			},
			"errorFunc": function(status, error) {
				console.log(status, error)
			}
		})
	}

	Chat.prototype.set_channel_url = function(url) {
		Chat.instance.channel_url = url
	}

	Chat.prototype.set_channel_id = function(id) {
		Chat.instance.channel_id = id
	}

	Chat.prototype.set_typing_to_start = function() {
		sendbird.typeStart();
	}

	Chat.prototype.set_typing_to_stop = function() {
		sendbird.typeEnd();
	}
	return Chat;
})();

var Audio = (function(){
	function Audio(user,userId,role,users,chairId,audioSource,key,stun,turn) {
		if(!Audio.instance){
			Audio.instance = this
			Audio.instance.user = user
			Audio.instance.userId = userId
			Audio.instance.userRole = role
			Audio.instance.users = users
			Audio.instance.chairId = chairId
			Audio.instance.stun = stun
			Audio.instance.turn = turn
			Audio.instance.key = key
			Audio.instance.audioSource = $(audioSource)
			Audio.instance.audioPlay = document.getElementById(audioSource)
			//if admin...else
			if (Audio.instance.userRole == "Chair") {
				Audio.instance.getMedia()
			} else {
				Audio.instance.createPeer()
				Audio.instance.receiveCall()
				Audio.instance.callBack()
			}
		}
	};
	//set up user media object for each user
	Audio.prototype.getMedia = function() {
		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
		navigator.getUserMedia({audio: true, video: false}, function(stream){
			Audio.instance.stream = stream
			Audio.instance.createPeer()
			Audio.instance.users.forEach(Audio.instance.callUser)
		}, function(err){
			console.log(err)
		});
	}

	//create peer object associated with user
	Audio.prototype.createPeer = function() {
		// console.log(Audio.instance.stun)
		// console.log(Audio.instance.turn)
		Audio.instance.peer = new Peer (
			Audio.instance.userId,
			{
				//key: Audio.instance.key,
				config: {'iceServers': [
					Audio.instance.stun,
					Audio.instance.turn
				]},
				host: window.location.host,
				port: 9974,
				path: '/'
			}
		);
		//Audio.instance.peer = new Peer(Audio.instance.userId, {host: window.location.host, port: 9974, path: '/'});

		Audio.instance.peer.on('connection', function(conn) {
			Audio.instance.callUser(conn['peer']) //callback!
		})

		Audio.instance.peer.on('open', function(id) {
			console.log('my id is: ' + id)
		});
	}

	//call other users (only with admin..etc)
	Audio.prototype.callUser = function(user) {
		Audio.instance.peer.call(user, Audio.instance.stream)
	}

	Audio.prototype.callBack = function() {
		var conn = Audio.instance.peer.connect(Audio.instance.chairId)
		conn.send('callBack')
	}

	//listener to respond when receiving calls
	Audio.prototype.receiveCall = function() {
		Audio.instance.peer.on('call', function(call) {
			call.answer()
			call.on('stream', function(s){
				Audio.instance.audioSource.attr("src", URL.createObjectURL(s))
				Audio.instance.audioPlay.play()
			})
		})
	}
	return Audio;
})();

