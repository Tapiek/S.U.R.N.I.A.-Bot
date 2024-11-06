// commands/padd.js

const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('padd')
        .setDescription('Create a Starfleet PADD message'),

    async execute(interaction) {
        // Create the PADD modal
        const modal = new ModalBuilder()
            .setCustomId('padd_modal')
            .setTitle('PADD Communication');

        // Create text input fields for the modal
        const toInput = new TextInputBuilder()
            .setCustomId('to')
            .setLabel('To')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const ccInput = new TextInputBuilder()
            .setCustomId('cc')
            .setLabel('CC:')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const fromInput = new TextInputBuilder()
            .setCustomId('from')
            .setLabel('From')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const bodyInput = new TextInputBuilder()
            .setCustomId('body')
            .setLabel('Body')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const imageUrlInput = new TextInputBuilder()
            .setCustomId('image_url')
            .setLabel('Image URL (Optional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        // Add inputs to the modal
        const actionRows = [
            new ActionRowBuilder().addComponents(toInput),
            new ActionRowBuilder().addComponents(ccInput),
            new ActionRowBuilder().addComponents(fromInput),
            new ActionRowBuilder().addComponents(bodyInput),
            new ActionRowBuilder().addComponents(imageUrlInput),
        ];

        modal.addComponents(...actionRows);

        // Show the modal
        await interaction.showModal(modal);
    },

    async handleModalSubmit(interaction) {
        // Retrieve input values from modal
        const to = interaction.fields.getTextInputValue('to');
        const from = interaction.fields.getTextInputValue('from');
        const body = interaction.fields.getTextInputValue('body');
        const cc = interaction.fields.getTextInputValue('cc') || 'None'; // Optional
        const imageUrl = interaction.fields.getTextInputValue('image_url') || null; // Optional

        // Create the embed for the PADD message
        const embed = new EmbedBuilder()
            .setTitle(`PADD Communication`)
            .addFields(
                { name: 'To', value: to, inline: true },
                { name: 'CC', value: cc, inline: true },
                { name: 'From', value: from, inline: true },
                { name: 'Body', value: body, inline: false }
            )
            .setColor(0x00ADEF)
            .setTimestamp();

        // If an image URL is provided, add it to the embed
        if (imageUrl) {
            embed.setImage(imageUrl);
        }

        // Send the embed to the specified channel (1257259932328132630)
        const channel = interaction.guild.channels.cache.get('1257259932328132630');
        if (channel) {
            await channel.send({ embeds: [embed] });
            await interaction.reply({ content: 'PADD message sent successfully!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Error: Could not find the specified PADD channel.', ephemeral: true });
        }
    }
};
