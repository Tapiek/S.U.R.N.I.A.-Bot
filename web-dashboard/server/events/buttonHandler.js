// web-dashboard/server/events/buttonHandler.js

const { 
    EmbedBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder 
  } = require('discord.js');
  const config = require('../config.json');
  
  async function handleCharacterButtons(interaction) {
    const [action, characterName] = interaction.customId.split('_');
  
    // Check if user has permission to use these buttons
    if (!interaction.member.roles.cache.has(config.roles.gameMaster)) {
      return interaction.reply({
        content: 'You do not have permission to review character submissions.',
        ephemeral: true
      });
    }
  
    switch (action) {
      case 'approve':
        // Show rank selection modal
        const approveModal = new ModalBuilder()
          .setCustomId(`rank_select_${characterName}`)
          .setTitle('Select Character Rank');
  
        const rankInput = new TextInputBuilder()
          .setCustomId('rank')
          .setLabel('Choose Rank')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g., Lieutenant, Ensign')
          .setRequired(true);
  
        const positionInput = new TextInputBuilder()
          .setCustomId('position')
          .setLabel('Position (Optional)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g., Department Head, Acting')
          .setRequired(false);
  
        const approveRow1 = new ActionRowBuilder().addComponents(rankInput);
        const approveRow2 = new ActionRowBuilder().addComponents(positionInput);
        approveModal.addComponents(approveRow1, approveRow2);
  
        await interaction.showModal(approveModal);
        break;
  
      case 'revise':
        // Create revision thread
        const revisionChannel = await interaction.guild.channels.fetch('1261972651971444788');
        
        const thread = await revisionChannel.threads.create({
          name: `Revision - ${characterName}`,
          type: 'GUILD_PRIVATE_THREAD',
          reason: 'Character revision requested'
        });
  
        // Update original embed
        const reviseEmbed = EmbedBuilder.from(interaction.message.embeds[0])
          .setColor('#FFA500')
          .addFields({ name: 'Status', value: 'Under Revision', inline: true });
  
        await interaction.message.edit({
          embeds: [reviseEmbed],
          components: [] // Remove buttons
        });
  
        await thread.send({
          content: `Character revision needed for ${characterName}\nPlease provide feedback below.`
        });
  
        await interaction.reply({
          content: `Created revision thread: ${thread}`,
          ephemeral: true
        });
        break;
  
      case 'reject':
        // Show rejection reason modal
        const rejectModal = new ModalBuilder()
          .setCustomId(`reject_reason_${characterName}`)
          .setTitle('Reject Character');
  
        const reasonInput = new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Reason for rejection')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);
  
        const rejectRow = new ActionRowBuilder().addComponents(reasonInput);
        rejectModal.addComponents(rejectRow);
  
        await interaction.showModal(rejectModal);
        break;
    }
  }
  
  async function handleModalSubmit(interaction) {
    const [action, type, characterName] = interaction.customId.split('_');
  
    if (action === 'rank' && type === 'select') {
      const rank = interaction.fields.getTextInputValue('rank');
      const position = interaction.fields.getTextInputValue('position');
  
      // Update the embed
      const approveEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor('#00FF00')
        .addFields(
          { name: 'Status', value: 'Approved', inline: true },
          { name: 'Rank', value: rank, inline: true },
          position ? { name: 'Position', value: position, inline: true } : null
        ).filter(field => field !== null);
  
      await interaction.message.edit({
        embeds: [approveEmbed],
        components: [] // Remove buttons
      });
  
      await interaction.reply({
        content: `Approved ${characterName} with rank ${rank}${position ? ` and position ${position}` : ''}`,
        ephemeral: true
      });
  
    } else if (action === 'reject' && type === 'reason') {
      const reason = interaction.fields.getTextInputValue('reason');
  
      // Update the embed
      const rejectEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor('#FF0000')
        .addFields(
          { name: 'Status', value: 'Rejected', inline: true },
          { name: 'Reason', value: reason }
        );
  
      await interaction.message.edit({
        embeds: [rejectEmbed],
        components: [] // Remove buttons
      });
  
      await interaction.reply({
        content: `Rejected ${characterName}. Reason: ${reason}`,
        ephemeral: true
      });
    }
  }
  
  module.exports = {
    handleCharacterButtons,
    handleModalSubmit
  };