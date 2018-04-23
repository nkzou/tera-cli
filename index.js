const fs = require('fs')
const config = require('./config/config.json')
const itemdc = require('./datacenter/fullitems-'+config.region)
const servers = require('./config/servers.json')
const webClient = require('tera-auth-ticket')
const {
  Connection,
  FakeClient
} = require('tera-proxy-game')
var npmstring = require('string')
var blessed = require('blessed')
var screen = blessed.screen({
  smartCSR: true,
  autoPadding: true,
  dockBorders: true
})

screen.title = 'TERA Terminal Client'

// Console
var console = blessed.box({
  top: '2%',
  left: 'center',
  width: '80%',
  height: '80%',
  draggable: true,
  border: {
    type: 'line'
  }
})

console.hide()
screen.append(console)

console.log = (string) => {
  console.insertLine(0, string)
  screen.render()
}
screen.key(['C-q'], (ch, key) => {
  console.toggle()
  console.focus()
  console.setFront()
  screen.render()
});

//Menu
var menu = blessed.list({
  top: '0',
  left: '0',
  width: '20%',
  height: '30%',
  align: 'center',
  items: ["Home", "Chat", "Friend/Guild List", "Inventory", "Crafting", "Trade Broker", "Inspector"],
  tags: true,
  mouse: true,
  interactive: true,
  keys: true,
  border: {
    type: 'line'
  },
  style: {
    selected: {
      fg: 'black',
      bg: 'white'
    },
    fg: 'white',
    bg: 'black',
    border: {
      fg: '#f0f0f0'
    }
  }
})
screen.append(menu)
//info-panel
var info = blessed.list({
  top: '30%',
  left: '0',
  width: '20%',
  height: '70%',
  items: ["Current Information",
    "Character Name:",
    " > Redacted.Name",
    "Location:",
    " > Highwatch"
  ],
  tags: true,
  border: {
    type: 'line'
  },
  style: {
    selected: {
      underline: true
    },
    fg: 'white',
    bg: 'black',
    border: {
      fg: '#f0f0f0'
    }
  }
})
info.select(0)
screen.append(info)

//contentbox
var content = blessed.log({
  content: "",
  top: '0%',
  left: '20%',
  width: '80%',
  height: '90%',
  tags: true,
  keys: true,
  mouse: true,
  scrollbar: true,
  border: {
    type: 'line'
  },
  padding: {
    bottom: 0
  },
  style: {
    fg: 'white',
    bg: 'black',
    border: {
      fg: '#f0f0f0'
    }
  }
})
var chat = blessed.textbox({
  top: '90%',
  left: '35%',
  width: '65%',
  height: 'shrink',
  tags: true,
  mouse: true,
  inputOnFocus: true,
  border: {
    type: 'line'
  },
  padding: {
    top: 0
  },
  style: {
    fg: 'white',
    bg: 'black',
    border: {
      fg: '#f0f0f0'
    }
  }
})
var chatpanel = blessed.box({
  content: "{#46FF41-fg}[Guild]{/}",
  top: '90%',
  left: '20%',
  width: '15%',
  height: 'shrink',
  tags: true,
  border: {
    type: 'line'
  },
  padding: {
    top: 0
  },
  style: {
    fg: 'white',
    bg: 'black',
    border: {
      fg: '#f0f0f0'
    }
  }
})
var friend_list = blessed.box({
  top: '0%',
  left: '20%',
  width: '40%',
  height: '90%',
  label: 'Friend List',
  items: [],
  tags: true,
  mouse: true,
  keys: true,
  scrollable:true,
  interactive: true,
  border: {
    type: 'line'
  },
  style: {
    selected:{
      fg: '#FFC0CC'
    },
    fg: 'white',
    bg: 'black',
    border: {
      fg: '#f0f0f0'
    }
  }
})
var guild_list = blessed.box({
  top: '0%',
  left: '60%',
  width: '40%',
  height: '90%',
  label: 'Guild List',
  items: [],
  tags: true,
  mouse: true,
  keys: true,
  interactive: true,
  scrollable:true,
  border: {
    type: 'line'
  },
  style: {
    selected:{
      fg: '#FFC0CC'
    },
    fg: 'white',
    bg: 'black',
    border: {
      fg: '#f0f0f0'
    }
  }
})

var friendmap={}
var guildmap={}
var currentGuild = null

function updateLists(){
  friend_list.setContent("")
  for(var f in friendmap){
    if(friendmap[f].status != 2) friend_list.pushLine("{#46FF41-fg}* "+`${friendmap[f].name} {|} [${friendmap[f].desc}]`+"{/}")
  }
  for(var f in friendmap){
    if(friendmap[f].status == 2) friend_list.pushLine(`* ${friendmap[f].name} {|} [${friendmap[f].desc}]`+"{/}")
  }
  guild_list.setContent("")
  if(currentGuild == null){
    guild_list.pushLine("You are not in a Guild.")
    screen.render()
    return
  }
  for(var m in guildmap){
    if(guildmap[m].status != 2) guild_list.pushLine("{#46FF41-fg}* "+`${guildmap[m].name} {|} [${guildmap[m].desc}]`+"{/}")
  }
  for(var m in guildmap){
    if(guildmap[m].status == 2) guild_list.pushLine(`* ${guildmap[m].name} {|} [${guildmap[m].desc}]`+"{/}")
  }
  screen.render()
}
screen.append(content)
screen.append(chatpanel)
screen.append(chat)
screen.append(friend_list)
screen.append(guild_list)

var currentWindow = "Home"
function hideAll() {
  content.hide()
  //chat.hide()
  //chatpanel.hide()
  friend_list.hide()
  guild_list.hide()
}

hideAll()

//say = 0, party = 1, guild = 2, area = 3, trade = 4, greet = 9,
//private = 11-18, p-notice = 21, emote = 26, global = 27, r-notice = 25,
//raid = 32, megaphone = 213, guild-adv = 214
const chatChannels = {
  0: '{#FFFFFE-fg}[Say]',
  1: '{#48ADFF-fg}[Party]',
  2: '{#46FF41-fg}[Guild]',
  3: '{#896BE3-fg}[Area]',
  4: '{#BD9633-fg}[Trade]',
  9: '{#FFBD00-fg}[Greeting]',
  26: '{#FFC0CB-fg}',
  27: '{#FFFF01-fg}[Global]',
  213: '{#FFFF01-fg}[Megaphone]',
  214: '{#6DBA6C-fg}[Guild-Ad]'
}

function parseTeraChat(evt) {
  msg = chatChannels[evt.channel]
  msg += '[' + evt.authorName + ']: '
  msg += npmstring(evt.message).stripTags().decodeHTMLEntities().s
  return msg + "{/}"
}
var currentChatChannel = 2
var whisperTarget = ''
const chatCommands = {
  '/g': 2,
  '/s': 0,
  '/a': 3,
  '/t': 4,
  '/o': 27
}
chat.on('keypress', () => {
  var c = chat.getValue()
  if (c.length == 2 && chatCommands[c] != null) {
    var ch = chatCommands[c]
    currentChatChannel = ch
    chatpanel.setContent(chatChannels[ch] + '{/}')
    setImmediate(() => {
      chat.clearValue()
      screen.render()
    })
  }
  if (c.startsWith('/w')){
    currentChatChannel = -1
    var count = (c.match(/ /g) || []).length
    if(count >= 2){
      var res = c.split(' ')
      whisperTarget = res[1]
      chatpanel.setContent('{#FF5694-fg}[-> '+whisperTarget+']{/}')
      setImmediate(() => {
        chat.clearValue()
        screen.render()
      })
    }
  }
})
const describe = (() => {
  const races = ['Human', 'High Elf', 'Aman', 'Castanic', 'Popori', 'Baraka']
  const genders = ['M.', 'F.']
  const classes = ['Warrior', 'Lancer', 'Slayer', 'Berserker', 'Sorcerer', 'Archer', 'Priest', 'Mystic', 'Reaper', 'Gunner', 'Brawler', 'Ninja', 'Valkyrie']

  return function describe(character) {
    let description = ''
    description += (character.level + " ")
    const race = races[character.race] || '?'
    const gender = genders[character.gender] || '?'

    if (character.race < 4) {
      description += `${race} ${gender}`
    } else {
      if (character.race === 4 && character.gender === 1) {
        description += 'Elin'
      } else {
        description += race
      }
    }

    description += ' ' + (classes[character['class']] || '?')
    return description
  }
})()

const srv = servers[config.server]
const web = new webClient(config.email, config.pass)
web.getLogin((err, data) => {
  if (err) return

  const connection = new Connection({
    "console": false,
    "protocol_data": {},
  })
  const client = new FakeClient(connection)
  const srvConn = connection.connect(client, {
    host: srv.host,
    port: srv.port
  })

  function killClient() {
    client.close()
    process.exit()
  }
  let closed = false

  connection.dispatch.setProtocolVersion(config.ProtocolVersion)

  connection.dispatch.load('<>', function coreModule(dispatch) {
    screen.realloc()
    client.on('connect', () => {
      dispatch.toServer('C_LOGIN_ARBITER', 2, {
        unk1: 0,
        unk2: 0,
        language: 2,
        patchVersion: 6303,
        name: data.name,
        ticket: new Buffer(data.ticket)
      })
    })

    menu.on('select', (item) => {
      var name = item.content
      if(name == currentWindow) return
      hideAll()
      if (name === "Chat") {
        content.show()
        //chat.show()
        //chatpanel.show()
      } else if (name === "Friend/Guild List") {
        updateLists()
        friend_list.show()
        guild_list.show()
        if(currentGuild != null){
          dispatch.toServer('C_REQUEST_GUILD_INFO', 1, {
            guildId: currentGuild,
            type:5
          })
        }
        dispatch.toServer('C_UPDATE_FRIEND_INFO', 1)
      } else if (name === "Inventory"){

      }
      currentWindow = name
      screen.render()
    })

    function closeClient() {
      if (closed) return
      closed = true
      process.exit()
      content.pushLine("Shutting down TERA-CLI...")
      dispatch.toServer('C_EXIT', 1)
      setTimeout(() => {
        content.pushLine("No Response from Server- Force Exiting")
        setTimeout(killClient, 1000)
      }, 5000)
    }
    dispatch.hook('S_PREPARE_EXIT', 1, () => {
      setTimeout(killClient, 1000)
    })
    screen.key(['escape', 'C-c'], function(ch, key) {
      return closeClient()
    })
    dispatch.hook('S_LOGIN', 10, () => {
      dispatch.toServer('C_GET_USER_LIST', 1)
    })

    dispatch.hook('S_GET_USER_LIST', 14, (event) => {
      const characters = new Map()
      for (const character of event.characters) {
        characters.set(character.name.toLowerCase(), {
          id: character.id,
          description: `${character.name} [${describe(character)}]`
        })
      }
      content.pushLine("Characters:")
      for (const char of characters.values()) {
        content.pushLine(`> ${char.description} (id: ${char.id})`)
      }
      const character = characters.get(config.character.toLowerCase())
      if (!character) {
        content.pushLine(`[client] no character "${config.character}"`)
      } else {
        content.pushLine(`[client] logging onto ${character.description} (id: ${character.id})`)
        dispatch.toServer('C_SELECT_USER', 1, {
          id: character.id,
          unk: 0
        })
      }
    })
    dispatch.hook('S_LOAD_TOPO', 2, () => {
      dispatch.toServer('C_LOAD_TOPO_FIN', 1)
    })

    dispatch.hook('S_PING', 1, () => {
      dispatch.toServer('C_PONG', 1)
    })
    /*
    dispatch.hook('S_SIMPLE_TIP_REPEAT_CHECK', 2, (event) => {
      dispatch.toServer('C_SIMPLE_TIP_REPEAT_CHECK', 1, {
        id: event.id
      })
    })
    */
    dispatch.hook('S_CHAT', 2, (event) => {
      content.pushLine(parseTeraChat(event))
    })
    chat.on('submit', () => {
      var msg = chat.getValue()
      if(msg.startsWith('/')) return
      if(currentChatChannel >= 0){
        dispatch.toServer('C_CHAT', 1, {
          channel: currentChatChannel,
          message: msg
        })
      } else if (currentChatChannel == -1){
        dispatch.toServer('C_WHISPER', 1, {
          target: whisperTarget,
          message: msg
        })
      }
      chat.clearValue()
      chat.focus()
    })
    client.on('close', () => {
      try{
        closeClient()
      }
      catch(err){
        killClient()
      }
    })
    dispatch.hook('S_UPDATE_FRIEND_INFO', 1, (event) => {
      console.log("FU<"+Object.keys(event.friends).length)
      for(var c of event.friends){
        friendmap[c.id] = {
          "name":c.name,
          "desc":`${describe(c)}`,
          "status": c.status
        }
      }
    })
    dispatch.hook('S_FRIEND_LIST', 1, (event) => {
      console.log("FL<"+Object.keys(event.friends).length)
      for(var c of event.friends){
        friendmap[c.id] = {
          "name":c.name,
          "desc":`${describe(c)}`,
          "status": 2
        }
      }
    })
    dispatch.hook('S_GUILD_INFO', 1, (event) => {
      currentGuild = event.id
    })
    dispatch.hook('S_GUILD_MEMBER_LIST', 1, (event) => {
      console.log("GL<"+Object.keys(event.members).length)
      for(var c of event.members){
        guildmap[c.playerID] = {
          "name":c.name,
          "desc":`${describe(c)}`,
          "status": c.status
        }
      }
    })
    dispatch.hook("S_WHISPER", 2, (evt)=>{
      var msg = npmstring(evt.message).stripTags().decodeHTMLEntities().s
      if(config.character === evt.author){
        content.pushLine("{#FF5694-fg}[-> "+evt.recipient+"]: "+msg+"{/}")
      } else{
        content.pushLine("{#FF5694-fg}[<- "+evt.author+"]: "+msg+"{/}")
      }
    })
    dispatch.hook("S_INVEN", 12, (evt)=>{
      console.log("INV<"+Object.keys(evt.items).length)
      for(var item of evt.items){
        if(itemdc[item.dbid])
          console.log(""+itemdc[item.dbid].name)
      }
    })
  })
  fs.readdirSync('./modules/').forEach(file => {
      connection.dispatch.load('./modules/' + file, module, content)
  })
  srvConn.setTimeout(10 * 1000)

  srvConn.on('connect', () => {
    content.pushLine(`Connected to <${srvConn.remoteAddress}:${srvConn.remotePort}> aka ${config.server}`)
  })

  srvConn.on('timeout', () => {
    content.pushLine('<timeout>')
    process.exit()
  })

  srvConn.on('close', () => {
    content.pushLine('<disconnected>')
    process.exit()
  })

  srvConn.on('error', (err) => {
    console.log(err)
    process.exit()
  })
})
