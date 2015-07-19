;(function() {
  'use strict';
  var current_chatting_room_index = 0;
  var current_online_person = [];
  var chatting_room_info = [];
  var msg_box = $('#msg-area')[0];
  var user_box = $('#chat-user-list')[0];
  var chat_title = $('#chat-title');
  var input_area = $('#user-input');
  var chatting_room_list = $('#room-list')[0];
  var path_all_for_del = null;
  var path_room_for_del = null;
  var all_users = new Firebase('https://chatting-room.firebaseio.com/all-online-user');
  var all_rooms = new Firebase('https://chatting-room.firebaseio.com/rooms');
  var one_room_users = [];
  var one_room_chat = [];
  var name = null;
  var photo = 1;
  var error_box = $('#error');
  var error_msg = $('#error-msg');
  var login_modal = $('#myModal');
  var user_name_input = $('#user_name');
  var room_list = null;
  var init_flag = 0;

  //通过名字拿到照片信息
  var get_photo_by_name = function (name) {
    for (var x in current_online_person) {
      if (current_online_person[x].name == name) {
        return current_online_person[x].photo;
      }
    }
    return 1;
  };

  //增加聊天内容
  var add_room_chat = function(item) {
    var str = item.text.replace('\n', '<br/>');
    msg_box.innerHTML += "<div class='"
                          + ((name == item.name) ? "my-msg" : "other-msg") + "'> \
                          <img class='chat-photo' src='images/photos/00"
                          + item.photo + ".jpg'/><div class='content'><span>"
                          + item.name + "</span><br/><div><p class='panel panel-default'>"
                          + str + "</p></div></div></div>";
    msg_box.scrollTop = msg_box.scrollHeight;
    emojify.run();
  };

  //设置聊天室信息
  var set_room_chat_list = function(index) {
    msg_box.innerHTML = "";
    for (var x in chatting_room_info[index].chats) {
      add_room_chat(chatting_room_info[index].chats[x]);
    }
  };

  //设置聊天室成员列表
  var set_room_users_list = function(index) {
    chat_title.html(chatting_room_info[index].name + "(" + chatting_room_info[index].users.length + ")");
    user_box.innerHTML = "";
    for (var x in chatting_room_info[index].users) {
      var temp_name = chatting_room_info[index].users[x].name;
      var temp_photo = get_photo_by_name(temp_name);
      user_box.innerHTML += ("<li title=" + temp_name + "><img class='chat-photo' src='images/photos/00"
                         + temp_photo + ".jpg'/><br/><span>" + temp_name + "</span></li>");
    }
  };

  //初始化结束
  var init_finish = function() {
    if (init_flag >= 2) {
      set_room_users_list(0);
      add_chatting_room(chatting_room_info);
      login_modal.off('hide.bs.modal');
      init_flag = -1;
      room_list = $('.room');
      room_list.each(function(i, e) {
        e.onclick = function() {
          var index = Number(this.getAttribute('index'));
          if (index != current_chatting_room_index) {
            room_list.each(function(i, e) {
              e.setAttribute('class', 'room')
            });
            this.setAttribute('class', 'room on-active')
            logoutFromRoom(current_chatting_room_index);
            current_chatting_room_index = index;
            one_room_users[current_chatting_room_index].push(name);
            set_room_users_list(current_chatting_room_index);
            set_room_chat_list(current_chatting_room_index);
          }
        }
      });
      for (var x in chatting_room_info) {
        one_room_users.push(new Firebase('https://chatting-room.firebaseio.com/rooms/' + chatting_room_info[x].url + '/users'));
        one_room_chat.push(new Firebase('https://chatting-room.firebaseio.com/rooms/' + chatting_room_info[x].url + '/chats'));
        one_room_users[x].on('value', function(snapshot) {
          var index = 0;
          for (var y in chatting_room_info) {
            if (chatting_room_info[y].url == snapshot.ref().path.n[1]) {
              index = y;
              break;
            }
          }
          chatting_room_info[index].users = $.map(snapshot.val(), function(value, index) {
            if (value == name) {
              path_room_for_del = index;
            }
            return {
              url: index,
              name: value
            };
          });
          if (index == current_chatting_room_index) {
            set_room_users_list(index);
          }
        });
        one_room_chat[x].on('child_added', function(snapshot) {
          var index = 0;
          for (var y in chatting_room_info) {
            if (chatting_room_info[y].url == snapshot.ref().path.n[1]) {
              index = y;
              break;
            }
          }
          var chat_item = snapshot.val();
          chatting_room_info[index].chats.push(chat_item);
          if (index == current_chatting_room_index) {
            add_room_chat(chat_item);
          }
        });
      }
    }
  };

  //在登陆的时候显示错误信息
  var show_error = function (msg) {
    error_msg.html(msg);
    error_box.show();
  };

  //隐藏错误信息
  var hide_error = function () {
    error_box.hide();
  };

  //检查登陆输入是否合法
  var check_info = function() {
    if (init_flag == 0 || init_flag == 1) {
      show_error("请等待数据获取完毕");
      return false;
    }
    var temp_name = user_name_input.val();
    if (temp_name == "") {
      show_error("请输入用户名");
      return false;
    }
    for (var x in current_online_person) {
      if (current_online_person[x].name == temp_name) {
        show_error("该用户已经存在");
        return false;
      }
    }
    var temp_photo = $("input[name='rd']:checked").val();
    if (!temp_photo) {
      show_error("请选择一个头像");
      return false;
    }
    temp_photo = Number(temp_photo);
    return {
      name: temp_name,
      photo: temp_photo
    };
  };

  //从某房间退出
  var logoutFromRoom = function (index) {
    if (name != null && path_room_for_del != null) {
        one_room_users[index].child(path_room_for_del).set(null);
    }
  };

  //登出
  var logout = function () {
    if (name != null && path_all_for_del != null) {
        all_users.child(path_all_for_del).set(null);
    }
    logoutFromRoom(current_chatting_room_index);
  };

  //增加聊天室列表 只增加一次
  var add_chatting_room = function(room_list) {
    var i = 0;
    for (var x in room_list) {
      i++;
      chatting_room_list.innerHTML += "<div index=" + x + " class='room" +
                                      (x == 0 ? " on-active" : "") + "'> \
                                      <div class='room-info'> \
                                      <img src='images/photos/room-" + i + ".jpg'/> \
                                      <span>" + room_list[x].name + "</span></div></div><hr class='no-margin'/>";
      if (i > 6) {
        i = 0;
      }
    }
  };

  //获取所有在线人员名单，一直监视事件
  all_users.on('value', function(snapshot) {
    current_online_person = $.map(snapshot.val(), function(value, index) {
      if (value.name == name) {
        path_all_for_del = index;
      }
      return {
        url: index,
        name: value.name,
        photo: value.photo
      };
    });
    //判断数据是否获取完毕
    if (init_flag != -1) {
      init_flag++;
      init_finish();
    }
  });

  //运行一遍拿到初始化数据
  all_rooms.once('value', function(snapshot) {
    chatting_room_info = $.map(snapshot.val(), function(value, index) {
      var temp_users = $.map(value.users, function(value, index) {
        return {
          name: value,
          url: index
        };
      });
      return {
        url: index,
        users: temp_users,
        name: value.name,
        chats: []
      };
    });

    //判断是否数据获取完毕
    if (init_flag != -1) {
      init_flag++;
      init_finish();
    }
  });

  //emoji表情支持
  emojify.setConfig({
    img_dir: './images/emoji'
  });
  emojify.run();

  //移动到底端
  msg_box.scrollTop = msg_box.scrollHeight;

  //emoji表情点击事件
  var faces = $('.face-show');
  faces.each(function(a, b) {
    b.onclick = function() {
      var temp = input_area.val();
      input_area.val(temp + " " + this.children[0].alt + " ");
      input_area.focus();
    };
  });
  $('#close-error-btn').click(function() {
    hide_error();
  });
  login_modal.modal('show').on('hide.bs.modal', function (e) {
    show_error("请等待数据获取完毕");
    return false;
  });
  $('#submit-data').click(function() {
    var res = check_info();
    if (typeof res == 'object') {
      logout();
      name = res.name;
      photo = res.photo;
      all_users.push({name: name, photo: photo});
      one_room_users[current_chatting_room_index].push(name);
      $('#photo')[0].src = 'images/photos/00' + photo + '.jpg';
      $('#name')[0].innerHTML = name;
      set_room_chat_list(current_chatting_room_index);
      login_modal.modal('hide');
      hide_error();
    }
  });
  $('#person-info').click(function() {
    hide_error();
    login_modal.modal('show');
  });
  $('#send').click(function() {
    if (name == null) {
      show_error("请先登录");
      login_modal.modal('show');
      return;
    }
    var temp = input_area.val();
    if (temp != "") {
      one_room_chat[current_chatting_room_index].push({name: name, text: temp, photo: photo});
      input_area.val("");
    }
  });
  $(window).on('beforeunload', function() {
    logout();
    if (name != null) {
      return "确定退出登录吗？";
    }
  });
  input_area.keypress(function(e) {
    if(e.ctrlKey && (e.which == 13 || e.which == 10)) {
      $('#send').trigger('click');
    }
  });
})();
