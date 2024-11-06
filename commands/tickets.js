// commands/tickets.js

const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionsBitField,
    ChannelType,
    AttachmentBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Opens a ticketing system for the server.'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('HELP CENTER')
            .setDescription(
                '**If you encounter an issue, have a question, or just need help, open a ticket using the buttons below.**\n\n' +
                '• Open a `Roleplay Ticket` for all requests relating to events, roleplay suggestions, or any question directed towards the Game Masters.\n' +
                '• Open a `Server Ticket` for player reports, general inquiries, server suggestions, or any question directed towards Administrators.'
            )
            .setColor(0x8B0000);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('roleplay_ticket')
                    .setLabel('Roleplay Ticket')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('server_ticket')
                    .setLabel('Server Ticket')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setLabel('Surnia.org')
                    .setURL('https://surnia.org')
                    .setStyle(ButtonStyle.Link)
            );

        // Send the message to the specific channel ID (1298505515386798131)
        const channel = interaction.guild.channels.cache.get('1298505515386798131');
        if (channel) {
            await channel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: 'Ticket message sent!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Could not find the ticket channel.', ephemeral: true });
        }
    },

    async handleButtonInteraction(interaction) {
        const customId = interaction.customId;

        if (customId === 'roleplay_ticket' || customId === 'server_ticket') {
            // Show modal to get the reason for opening a ticket
            const modal = new ModalBuilder()
                .setCustomId(customId + '_modal')
                .setTitle(customId === 'roleplay_ticket' ? 'Roleplay Ticket' : 'Server Ticket');

            const reasonInput = new TextInputBuilder()
                .setCustomId('reason')
                .setLabel('What is the reason for this ticket?')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            const actionRow = new ActionRowBuilder().addComponents(reasonInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);
        }
    },

    async handleModalSubmit(interaction) {
        const ticketType = interaction.customId.includes('roleplay_ticket') ? 'Roleplay' : 'Server';
        const reason = interaction.fields.getTextInputValue('reason');

        const ticketID = Math.floor(Math.random() * 10000); // Generate a simple ticket ID
        const username = interaction.user.username;
        const channelName = `${username}-${ticketID}`;

        // Create ticket channel in the specific category (1258005619458441280)
        const channel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: '1258005619458441280', // Place the channel in the specified category
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
                {
                    id: ticketType === 'Roleplay' ? '1252595499068821586' : '1252594198906015845', // Role IDs
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                }
            ],
        });

        const roleID = ticketType === 'Roleplay' ? '1252595499068821586' : '1252594198906015845';
        const embedColor = ticketType === 'Roleplay' ? 0x8B0000 : 0x00FF00; // Red for Roleplay, Green for Server

        // Send a message in the newly created ticket channel
        const embed = new EmbedBuilder()
            .setTitle(`${ticketType} Ticket`)
            .setDescription(`Ticket opened by <@${interaction.user.id}> for the following reason:\n\n**${reason}**`)
            .setColor(embedColor);

        const closeButton = new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(closeButton);

        await channel.send({
            content: `<@${interaction.user.id}> <@&${roleID}>`,
            embeds: [embed],
            components: [row]
        });

        await interaction.reply({
            content: `Your ${ticketType} ticket has been created in ${channel}.`,
            ephemeral: true
        });
    },

    async handleCloseButton(interaction) {
        if (interaction.customId === 'close_ticket') {
            const ticketChannel = interaction.channel;
            const messages = await ticketChannel.messages.fetch({ limit: 100 });
            const opener = messages.filter(m => m.type === 'CHANNEL_PINNED_MESSAGE').first()?.author || interaction.user;

            // Create a log of the ticket conversation
            const logMessages = messages.reverse().map((message) => 
                `[${message.createdAt}] || ${message.author.username} || ${message.content}`
            );

            const log = logMessages.join('\n');
            const ticketDuration = getTicketDuration(ticketChannel.createdAt, new Date());

            // Create an embed with ticket details
            const logEmbed = new EmbedBuilder()
                .setTitle('Ticket Closed')
                .setColor(0xFF0000)
                .addFields(
                    { name: 'Ticket ID', value: `${ticketChannel.name}`, inline: true },
                    { name: 'Opened by', value: `<@${opener.id}>`, inline: true },
                    { name: 'Closed by', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Opened At', value: `<t:${Math.floor(ticketChannel.createdAt / 1000)}:F>`, inline: true },
                    { name: 'Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: 'Duration', value: ticketDuration, inline: true },
                    { name: 'Reason', value: logMessages[logMessages.length - 1].split('||')[2] || 'Not provided' }
                );

            // Send the log as a text file
            const logBuffer = Buffer.from(log, 'utf-8');
            const file = new AttachmentBuilder(logBuffer, { name: `${ticketChannel.name}.txt` });

            // Send the log to the logging channel
            const logChannel = interaction.guild.channels.cache.get('1258008606863786036');
            if (logChannel) {
                await logChannel.send({ embeds: [logEmbed], files: [file] });
            }

            await interaction.reply({
                content: 'The ticket has been closed. This channel will be deleted shortly.',
                ephemeral: true
            });

            // Delete the ticket channel after a delay
            setTimeout(() => {
                ticketChannel.delete();
            }, 5000);
        }
    }
};

/**
 * Helper function to calculate the total duration of a ticket
 * @param {Date} startTime 
 * @param {Date} endTime 
 * @returns {string} Duration in days/hours/minutes/seconds
 */
function getTicketDuration(startTime, endTime) {
    const duration = endTime - startTime;
    const seconds = Math.floor((duration / 1000) % 60);
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    const days = Math.floor(duration / (1000 * 60 * 60 * 24));

    return `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
}
