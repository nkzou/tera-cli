var blessed = require('blessed');
var screen = blessed.screen({
    smartCSR: true,
    autoPadding: true,
    dockBorders: true
});

screen.title = 'TERA Terminal Client';

// Create a box perfectly centered horizontally and vertically.
var box = blessed.listbar({
    top: '0',
    left: '0',
    width: '100%',
    height: 'shrink',
    items: ["Information", "Broker", "Chat"],
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
screen.append(box);

// Quit on Escape or Control-C.
screen.key(['escape', 'C-c'], function(ch, key) {
  return process.exit(0);
});

// Focus our element.
box.focus();

// Render the screen.
screen.render();