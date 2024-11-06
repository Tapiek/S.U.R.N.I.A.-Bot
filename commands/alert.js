// commands/alert.js

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

const alertLevels = {
    red: {
        name: 'Red Alert',
        emoji: '🚨-🟥-🟥-🟥-🚨',
        color: 0xF8312F
    },
    yellow: {
        name: 'Yellow Alert',
        emoji: '🟨-🟨-🟨-🟨-🟨',
        color: 0xFFB02E
    },
    green: {
        name: 'Green Alert',
        emoji: '🟩-🟩-🟩-🟩-🟩',
        color: 0x00D26A
    },
    black: {
        name: 'Black Alert',
        emoji: '⬛-⬛-⬛-⬛-⬛',
        color: 0x000000
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('alert')
        .setDescription('Change the alert level of the ship.')
        .addStringOption(option =>
            option.setName('level')
                .setDescription('Select the alert level')
                .setRequired(true)
                .addChoices(
                    { name: 'Red', value: 'red' },
                    { name: 'Yellow', value: 'yellow' },
                    { name: 'Green', value: 'green' },
                    { name: 'Black', value: 'black' }
                )),
    permissions: [config.roles.gameMaster, config.roles.seniorStaff],
    async execute(interaction) {
        // Ensure the command is used within a guild
        if (!interaction.guild) {
            return interaction.reply({ 
                content: 'This command can only be used within a server.', 
                ephemeral: true 
            });
        }

        const level = interaction.options.getString('level').toLowerCase();
        const alertChannelId = config.channels.alertChannel;
        const channel = interaction.guild.channels.cache.get(alertChannelId);

        if (!channel) {
            return interaction.reply({ 
                content: 'Alert channel not found. Please check the configuration.', 
                ephemeral: true 
            });
        }

        const alert = alertLevels[level];
        if (!alert) {
            return interaction.reply({ 
                content: 'Invalid alert level selected.', 
                ephemeral: true 
            });
        }

        try {
            // Change the channel name to reflect the alert level
            await channel.setName(alert.emoji);

            // Fetch and delete the last 100 messages in the channel to clear previous alerts
            const fetched = await channel.messages.fetch({ limit: 100 });
            await channel.bulkDelete(fetched, true);

            // Create an embed message to announce the alert level change
            const embed = new EmbedBuilder()
                .setTitle('__Alert Status Change__')
                .setDescription(`<@${interaction.user.id}> has issued a **${alert.name}**\nAlert Issued @ <t:${Math.floor(Date.now() / 1000)}:t>`)
                .setColor(alert.color)
                .setTimestamp();

            // Send the embed to the alert channel
            await channel.send({ embeds: [embed] });

            // Acknowledge the command issuer
            await interaction.reply({ 
                content: `${alert.name} has been set successfully.`, 
                ephemeral: true 
            });
        } catch (error) {
            console.error(`Error setting alert level: ${error}`);
            await interaction.reply({ 
                content: 'There was an error changing the alert level. Please try again later.', 
                ephemeral: true 
            });
        }
    },
};
