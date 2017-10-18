const fs = require('fs')
const config = require('./config/config.json')
const servers = require('./config/servers.json')
const webClient = require('tera-auth-ticket')
const { Connection, FakeClient } = require('tera-proxy-game')

const describe = (() => {
	const races = ['Human', 'High Elf', 'Aman', 'Castanic', 'Popori', 'Baraka']
	const genders = ['Male', 'Female']
	const classes = ['Warrior', 'Lancer', 'Slayer', 'Berserker', 'Sorcerer', 'Archer','Priest', 'Mystic', 'Reaper', 'Gunner', 'Brawler', 'Ninja', 'Valkyrie']

	return function describe(character) {
		let description = 'Level '
		description += (character.level+" ")
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

		description += ' ' + (classes[character['class']] || '?') + ' / '
		return description
	}
})()

const srv = servers[config.server]
const web = new webClient(srv.srv, config.email, config.pass)
web.getLogin((err, data) => {
	if (err) return

	const connection = new Connection()
	const client = new FakeClient(connection)
	const srvConn = connection.connect(client, { host: srv.host, port: srv.port })

	let closed = false

	function closeClient() {
		if (closed) return
		closed = true
        console.log("Shutting down Elixir...")
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
				characters.set(character.name.toLowerCase(), {
					id: character.id,
					description: `${character.name} [${describe(character)}]`
				})
			}
            console.log("Characters:")
            for (const char of characters.values()) {
                console.log(`- ${char.description} (id: ${char.id})`)
            }
			const character = characters.get(config.character.toLowerCase())
			if (!character) {
				console.error(`[client] no character "${config.character}"`)
			} else {
				console.log(`[client] logging onto ${character.description} (id: ${character.id})`)
				dispatch.toServer('C_SELECT_USER', 1, {
					id: character.id,
					unk: 0
				})
			}
		})
		dispatch.hook('S_LOAD_TOPO', 2, () => {
			dispatch.toServer('C_LOAD_TOPO_FIN',1)
		})

		dispatch.hook('S_PING', 1, () => {
			dispatch.toServer('C_PONG',1)
		})

		dispatch.hook('S_SIMPLE_TIP_REPEAT_CHECK', 2, (event) => {
			dispatch.toServer('C_SIMPLE_TIP_REPEAT_CHECK', 1, {
				id : event.id
			})
		})

		client.on('close', () => {
			closeClient()
		})
	})
    /*
	fs.readdirSync('./modules/').forEach(file => {
		connection.dispatch.load('./modules/' + file, module)
	})*/
    connection.dispatch.load('./modules/teraCLI', module, closeClient)
	srvConn.setTimeout(10 * 1000)

	srvConn.on('connect', () => {
		console.log(`<connected to ${srvConn.remoteAddress}:${srvConn.remotePort}>`)
	})

	srvConn.on('timeout', () => {
		console.log('<timeout>')
		closeClient()
	})

	srvConn.on('close', () => {
		console.log('<disconnected>')
		process.exit()
	})

	srvConn.on('error', (err) => {
		console.warn(err)
	})
})
