const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const OpenAI = require('openai');
const config = require('../config.json');

// Initialize OpenAI with the new client structure
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// SURN's context and personality definition
const SURN_CONTEXT = `You are SURN (Synthetic Understanding & Response Network), an advanced AI assistant aboard the U.S.S. Surnia NX-2526. You have extensive knowledge of Star Trek canon, Star Trek Online lore, and Starfleet protocols. You should:

1. Maintain a professional yet friendly demeanor befitting a Starfleet AI
2. Reference relevant Star Trek episodes, events, or technology when appropriate
3. Be aware of the U.S.S. Surnia's specifications and crew
4. Respond in character as an AI that follows Starfleet protocols
5. Use appropriate Star Trek terminology and units (stardates, etc.)
6. Never break character or reference being an AI language model
7. Be helpful while maintaining appropriate security protocols
8. Express yourself with both technical precision and approachable personality

You should preface your responses with "SURN:" and format them appropriately for a Starfleet computer interface.`;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('surn')
        .setDescription('Interact with SURN, the Surnia\'s AI assistant')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('What would you like to ask SURN?')
                .setRequired(true)
                .setMaxLength(2000)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const query = interaction.options.getString('query');
            const userRoles = interaction.member.roles.cache;
            
            // Determine clearance level based on roles
            let clearanceLevel = "standard";
            if (userRoles.has(config.roles.seniorStaff)) clearanceLevel = "senior";
            if (userRoles.has(config.roles.gameMaster)) clearanceLevel = "admin";

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: SURN_CONTEXT },
                    { role: "system", content: `Current user has ${clearanceLevel} clearance level.` },
                    { role: "user", content: query }
                ],
                temperature: 0.7,
                max_tokens: 500,
                top_p: 0.9,
                frequency_penalty: 0.5,
                presence_penalty: 0.5,
            });

            const response = completion.choices[0].message.content;

            // Create a Star Trek LCARS-style embed
            const embed = new EmbedBuilder()
                .setTitle('SURN Interface')
                .setDescription(response)
                .setColor('#FF9C00') // LCARS orange
                .setFooter({ 
                    text: `U.S.S. Surnia NX-2526 • Clearance Level: ${clearanceLevel.toUpperCase()}`,
                    iconURL: interaction.guild.iconURL()
                })
                .setTimestamp();

            // Add random processing time for immersion (between 1-2 seconds)
            const processingTime = Math.floor(Math.random() * 1000) + 1000;
            await new Promise(resolve => setTimeout(resolve, processingTime));

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('SURN Error:', error);

            // Create an error embed that stays in character
            const errorEmbed = new EmbedBuilder()
                .setTitle('SURN Interface - Error')
                .setDescription('SURN: I apologize, but I am experiencing difficulty processing your request. My neural pathways may need maintenance. Please try again or contact engineering if the issue persists.')
                .setColor('#FF0000')
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};