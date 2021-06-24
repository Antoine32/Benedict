const {Client} = require('discord.js')
const auth = require('./auth.json');

const token = 'YOUR_TOKEN'

const client = new Client()
client.token = auth.token

const fetchUser = async id => client.users.fetch(id)
print(fetchUser)