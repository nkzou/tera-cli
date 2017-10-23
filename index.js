const fs = require('fs')
const config = require('./config/config.json')
const servers = require('./config/servers.json')
const webClient = require('tera-auth-ticket')
const {
    Connection,
    FakeClient
} = require('tera-proxy-game')
var npmstring = require('string')
var blessed = require('blessed')
var screenshotmode = true
var screen = blessed.screen({
    smartCSR: true,
    autoPadding: true,
    dockBorders: true
});
screen.key(['escape', 'C-c'], function(ch, key) {
    return process.exit(0);
});
screen.title = 'TERA Terminal Client';
setInterval(() => {
    //screen.realloc()
    screen.render()
}, 5000);
//Menu
var menu = blessed.list({
    top: '0',
    left: '0',
    width: '20%',
    height: '30%',
    align: 'center',
    items: ["Home", "Chat", "Friend List", "Inventory", "Crafting", "Trade Broker", "Inspector"],
    tags: true,
    mouse: true,
    autoCommandKeys: true,
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
});
screen.append(menu);
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
});
info.select(0);
screen.append(info);

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
    scrollbar:true,
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
});
screen.append(content);

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
});
var chatpanel = blessed.box({
    content: "All Chat",
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
});
screen.append(chatpanel);
screen.append(chat);

const describe = (() => {
    const races = ['Human', 'High Elf', 'Aman', 'Castanic', 'Popori', 'Baraka']
    const genders = ['Male', 'Female']
    const classes = ['Warrior', 'Lancer', 'Slayer', 'Berserker', 'Sorcerer', 'Archer', 'Priest', 'Mystic', 'Reaper', 'Gunner', 'Brawler', 'Ninja', 'Valkyrie']

    return function describe(character) {
        let description = 'Level '
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
//say = 0, party = 1, guild = 2, area = 3, trade = 4, greet = 9,
//private = 11-18, p-notice = 21, emote = 26, global = 27, r-notice = 25,
//raid = 32, megaphone = 213, guild-adv = 214
chatChannels = {
    0: '{#FFFFFE-fg}[Say]',
    1: '{#48ADFF-fg}[Party]',
    2: '{#12DE3A-fg}[Guild]',
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

const srv = servers[config.server]
const web = new webClient(srv.srv, config.email, config.pass)
web.getLogin((err, data) => {
    if (err) return

    const connection = new Connection()
    const client = new FakeClient(connection)
    const srvConn = connection.connect(client, {
        host: srv.host,
        port: srv.port
    })

    let closed = false

    function closeClient() {
        if (closed) return
        closed = true
        console.log("Shutting down TERA-CLI...")
        client.close()
        setImmediate(() => {
            console.log("Exiting")
            process.exit()
        })
    }

    connection.dispatch.setProtocolVersion(config.ProtocolVersion)

    connection.dispatch.load('<>', function coreModule(dispatch) {
        client.on('connect', () => {
            dispatch.toServer('C_LOGIN_ARBITER', 2, {
                unk1: 0,
                unk2: 0,
                language: 2,
                patchVersion: 6103,
                name: data.name,
                ticket: new Buffer(data.ticket)
            })
        })

        dispatch.hook('S_LOGIN_ACCOUNT_INFO', 1, () => {
            dispatch.toServer('C_GET_USER_LIST', 1)
        })

        dispatch.hook('S_GET_USER_LIST', 5, (event) => {
            const characters = new Map()
            for (const character of event.characters) {
                if (screenshotmode) {
                    characters.set(character.name.toLowerCase(), {
                        id: character.id,
                        description: `Redacted.Name [${describe(character)}]`
                    })
                } else {
                    characters.set(character.name.toLowerCase(), {
                        id: character.id,
                        description: `${character.name} [${describe(character)}]`
                    })
                }
            }
            content.pushLine("Characters:")
            for (const char of characters.values()) {
                if (screenshotmode) content.pushLine(`> ${char.description} (id: redacted_id)`)
                else content.pushLine(`> ${char.description} (id: ${char.id})`)
            }
            const character = characters.get(config.character.toLowerCase())
            if (!character) {
                content.pushLine(`[client] no character "${config.character}"`)
            } else {
                if (screenshotmode) content.pushLine(`[client] logging onto ${character.description} (id: redacted_id)`)
                else content.pushLine(`[client] logging onto ${character.description} (id: ${character.id})`)
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

        dispatch.hook('S_SIMPLE_TIP_REPEAT_CHECK', 2, (event) => {
            dispatch.toServer('C_SIMPLE_TIP_REPEAT_CHECK', 1, {
                id: event.id
            })
        })
        dispatch.hook('S_CHAT', 1, (event) => {
            content.pushLine(parseTeraChat(event))
        })
        chat.on('submit', ()=>{
            var msg = chat.getValue()
            dispatch.toServer('C_CHAT', 1, {
                channel: 2,
                message: msg
            })
            chat.clearValue()
            chat.focus()
        })
        client.on('close', () => {
            closeClient()
        })
    })
    /*
    fs.readdirSync('./modules/').forEach(file => {
        connection.dispatch.load('./modules/' + file, module)
    })*/
    //connection.dispatch.load('./modules/teraCLI', module, closeClient)
    srvConn.setTimeout(10 * 1000)

    srvConn.on('connect', () => {
        if (screenshotmode) content.pushLine(`Connected to <redacted_ip:redacted_port> aka Celestial Mount Tempest Ascension Forest`)
        else content.pushLine(`Connected to <${srvConn.remoteAddress}:${srvConn.remotePort}> aka ${config.server}`)
    })

    srvConn.on('timeout', () => {
        content.pushLine('<timeout>')
        closeClient()
    })

    srvConn.on('close', () => {
        content.pushLine('<disconnected>')
        process.exit()
    })

    srvConn.on('error', (err) => {
        content.pushLine(err)
    })
})
