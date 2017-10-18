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
    items: ["Home", "Trade Broker", "Chat", "Inventory", "Crafting"],
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
            bold: true,
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
