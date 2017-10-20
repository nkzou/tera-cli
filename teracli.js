var blessed = require('blessed');

var screen = blessed.screen({
    smartCSR: true,
    autoPadding: true,
    dockBorders: true
});
screen.key(['escape', 'C-c'], function(ch, key) {
  return process.exit(0);
});
screen.title = 'TERA Terminal Client';
setInterval(()=>{
    screen.realloc();
    screen.render();
}, 1000);
//Menu
var menu = blessed.list({
    top: '0',
    left: '0',
    width: '20%',
    height: '30%',
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
            " > Kanawanai",
            "Location:",
            " > RK-9 Kennel"],
    tags: true,
    border: {
        type: 'line'
    },
    style: {
        selected:{
            underline:true
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
var content = blessed.box({
    content: "[Name.Redacted] this is a chat message\n[Redacted.Name] yes wow very terms of service",
    top: '0%',
    left: '20%',
    width: '80%',
    height: '100%',
    tags: true,
    keys: true,
    border: {
        type: 'line'
    },
    padding: {
        bottom:-1
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
    bottom: '0',
    left: '15%',
    width: '85%',
    height: 'shrink',
    tags: true,
    mouse: true,
    inputOnFocus: true,
    border: {
        type: 'line'
    },
    padding: {
        top:0
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
    bottom: '0',
    left: '0%',
    width: '15%',
    height: 'shrink',
    tags: true,
    border: {
        type: 'line'
    },
    padding: {
        top:0
    },
    style: {
        fg: 'white',
        bg: 'black',
        border: {
            fg: '#f0f0f0'
        }
    }
});
content.append(chatpanel);
content.append(chat);