const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
const express = require('express');

const app = express();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Dummy server for Render
app.get('/', (req, res) => res.send('OK'));

// When bot is ready
client.on('ready', () => {
  console.log('✅ GREEN DOT!');
  
  const cmd = new SlashCommandBuilder()
    .setName('start')
    .setDescription('Clean');
  
  client.application.commands.create(cmd);
});

// Handle slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'start') {
    await interaction.reply('✅ WORKING! Found 3 channels archived!');
  }
});

// Start dummy HTTP server
app.listen(10000, () => console.log('🌐 Dummy server running on port 10000'));

// Login bot
client.login(process.env.TOKEN);
