// commands/approve.js

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('approve')
        .setDescription('Approve a user as a character by assigning roles.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to approve')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('department')
                .setDescription('Select the department')
                .setRequired(true)
                .addChoices(
                    { name: 'Command', value: 'command' },
                    { name: 'Tactical', value: 'tactical' },
                    { name: 'Intelligence', value: 'intelligence' },
                    { name: 'Diplomatic Corps', value: 'diplomaticCorps' },
                    { name: 'Science', value: 'science' },
                    { name: 'Medical', value: 'medical' },
                    { name: 'Research & Development', value: 'researchAndDevelopment' },
                    { name: 'Operations', value: 'operations' },
                    { name: 'Engineering', value: 'engineering' },
                    { name: 'Security', value: 'security' }
                ))
        .addStringOption(option =>
            option.setName('rank')
                .setDescription('Select the rank')
                .setRequired(true)
                .addChoices(
                    { name: 'Captain', value: 'captain' },
                    { name: 'Commander', value: 'commander' },
                    { name: 'Lieutenant Commander', value: 'lieutenantCommander' },
                    { name: 'Lieutenant', value: 'lieutenant' },
                    { name: 'Lieutenant Junior Grade', value: 'lieutenantJuniorGrade' },
                    { name: 'Ensign', value: 'ensign' }
                ))
        .addStringOption(option =>
            option.setName('position')
                .setDescription('Select the position (optional)')
                .setRequired(false)
                .addChoices(
                    { name: 'Acting', value: 'acting' },
                    { name: 'Commanding Officer', value: 'commandingOfficer' },
                    { name: 'Executive Officer', value: 'executiveOfficer' },
                    { name: 'Senior Staff', value: 'seniorStaffPosition' },
                    { name: 'Department Head', value: 'departmentHead' },
                    { name: 'Deputy Department Head', value: 'deputyDepartmentHead' },
                    { name: 'Helmsman / Pilot', value: 'helmsmanPilot' }
                )),
    permissions: [config.roles.gameMaster],
    async execute(interaction) {
        // Ensure the command is used within a guild
        if (!interaction.guild) {
            return interaction.reply({ 
                content: 'This command can only be used within a server.', 
                ephemeral: true 
            });
        }

        // Extract options
        const targetUser = interaction.options.getUser('user');
        const departmentKey = interaction.options.getString('department');
        const rankKey = interaction.options.getString('rank');
        const positionKey = interaction.options.getString('position');

        // Fetch the member from the guild
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) {
            return interaction.reply({ 
                content: 'The specified user is not a member of this server.', 
                ephemeral: true 
            });
        }

        // Fetch roles from config
        const departmentRoleId = config.departments[departmentKey];
        const rankRoleId = config.ranks[rankKey];
        const positionRoleId = positionKey ? config.positions[positionKey] : null;

        // Determine the division based on department
        let divisionKey = '';
        switch (departmentKey) {
            case 'command':
            case 'tactical':
            case 'intelligence':
            case 'diplomaticCorps':
                divisionKey = 'command';
                break;
            case 'science':
            case 'medical':
            case 'researchAndDevelopment':
                divisionKey = 'science';
                break;
            case 'operations':
            case 'engineering':
            case 'security':
                divisionKey = 'operations';
                break;
            default:
                divisionKey = '';
        }

        const divisionRoleId = divisionKey ? config.divisions[divisionKey] : null;
        const approvedRoleId = '1253224120783601664'

        // Prepare roles to assign
        const rolesToAssign = [departmentRoleId, rankRoleId, approvedRoleId];
        if (positionRoleId) rolesToAssign.push(positionRoleId);
        if (divisionRoleId) rolesToAssign.push(divisionRoleId);

        // Remove any existing roles from previous approvals (optional)
        // You might want to define which roles to remove or reset
        // For simplicity, this example does not remove existing roles

        try {
            // Assign roles
            await member.roles.add(rolesToAssign);

            // Optionally, remove unneeded roles or manage role conflicts here

            // Create an embed to confirm the approval
            const embed = new EmbedBuilder()
                .setTitle('Character Approved')
                .setColor(0x00D26A)
                .addFields(
                    { name: 'User', value: `<@${targetUser.id}>`, inline: true },
                    { name: 'Department', value: departmentKey.charAt(0).toUpperCase() + departmentKey.slice(1).replace(/([A-Z])/g, ' $1'), inline: true },
                    { name: 'Rank', value: rankKey.charAt(0).toUpperCase() + rankKey.slice(1).replace(/([A-Z])/g, ' $1'), inline: true },
                    { name: 'Position', value: positionKey ? positionKey.charAt(0).toUpperCase() + positionKey.slice(1).replace(/([A-Z])/g, ' $1') : 'None', inline: true },
                    { name: 'Division', value: divisionKey ? divisionKey.charAt(0).toUpperCase() + divisionKey.slice(1) : 'None', inline: true }
                )
                .setTimestamp();

            // Send confirmation to the channel where the command was used
            await interaction.reply({ 
                embeds: [embed], 
                ephemeral: true 
            });

            // Optionally, log the approval in the mod log channel
            const logChannelId = config.channels.modLogChannel;
            if (logChannelId) {
                const logChannel = interaction.guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('Character Approval Log')
                        .setColor(0x00D26A)
                        .addFields(
                            { name: 'Approved By', value: `<@${interaction.user.id}>`, inline: true },
                            { name: 'User Approved', value: `<@${targetUser.id}>`, inline: true },
                            { name: 'Department', value: departmentKey.charAt(0).toUpperCase() + departmentKey.slice(1).replace(/([A-Z])/g, ' $1'), inline: true },
                            { name: 'Rank', value: rankKey.charAt(0).toUpperCase() + rankKey.slice(1).replace(/([A-Z])/g, ' $1'), inline: true },
                            { name: 'Position', value: positionKey ? positionKey.charAt(0).toUpperCase() + positionKey.slice(1).replace(/([A-Z])/g, ' $1') : 'None', inline: true },
                            { name: 'Division', value: divisionKey ? divisionKey.charAt(0).toUpperCase() + divisionKey.slice(1) : 'None', inline: true }
                        )
                        .setTimestamp();

                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
        } catch (error) {
            console.error(`Error approving user: ${error}`);
            await interaction.reply({ 
                content: 'There was an error approving the user. Please ensure I have the necessary permissions and try again.', 
                ephemeral: true 
            });
        }
    },
};
