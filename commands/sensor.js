// commands/sensor.js

require('dotenv').config();
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const OpenAI = require('openai');
const GIFEncoder = require('gif-encoder-2');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Initialize OpenAI with the new client structure
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Constants for the scan visualization
const SCAN_AREA = {
    left: 478,
    right: 1947,
    top: 208,
    bottom: 1317
};

const SCAN_WIDTH = SCAN_AREA.right - SCAN_AREA.left;
const SCAN_HEIGHT = SCAN_AREA.bottom - SCAN_AREA.top;
const MAIN_COLOR = '#aa4b46';

// Interface elements with corrected coordinates
const INTERFACE_ELEMENTS = {
    scannerCircle: { x: 259, y: 1023, radius: 58 },
    aiVisual: { x: 1172, y: 1493, radius: 58 },
    progressBar: {
        x: 505,
        y: 1374,
        width: 403,
        height: 29
    },
    consoleOutput: {
        x: 31,
        y: 419,
        width: 392,
        height: 450,
        lineHeight: 16,
        maxLines: 28,
        messageInterval: Math.floor(Math.random() * (40 - 13 + 1)) + 13  // Random interval between 13 and 40 frames
    }
};

// Scan types with matching color scheme
const SCAN_TYPES = {
    QUANTUM: {
        name: 'Quantum Scanner',
        description: 'Analyzes quantum fluctuations and subatomic anomalies',
        metrics: ['Quantum Coherence (Q.C.)', 'Entanglement Density (E.D.)', 'Phase Variance (P.V.)'],
        color: MAIN_COLOR
    },
    THERMAL: {
        name: 'Thermal Imaging',
        description: 'Maps temperature variations and heat signatures',
        metrics: ['Temperature (°C)', 'Heat Flux (W/m²)', 'Thermal Gradient (°C/m)'],
        color: MAIN_COLOR
    },
    SUBSPACE: {
        name: 'Subspace Scanner',
        description: 'Detects subspace distortions and anomalies',
        metrics: ['Field Strength (FS)', 'Distortion Level (D.L.)', 'Resonance (R.S.)'],
        color: MAIN_COLOR
    },
    BIOLOGICAL: {
        name: 'Bio-Scanner',
        description: 'Analyzes biological signatures and life forms',
        metrics: ['Bio-Signs (B.S.)', 'Genetic Patterns (G.P.)', 'Life Energy (L.E.)'],
        color: MAIN_COLOR
    }
};

// Helper function to ensure directories exist
function ensureDirectoriesExist() {
    const imgDir = path.join(__dirname, '..', 'images');
    const mediaDir = path.join(__dirname, '..', 'media', 'frames');
    if (!fs.existsSync(imgDir)) {
        fs.mkdirSync(imgDir, { recursive: true });
    }
    if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir, { recursive: true });
    }
    return imgDir;
}

// Function to generate the scan visualization GIF
async function generateScanVisualization(scanType, results, location) {
    try {
        const imgDir = ensureDirectoriesExist();
        const backgroundPath = path.join(imgDir, 'mainbackground.png'); // Ensure correct extension
        const logoPath = path.join(imgDir, 'surnialogo.png'); // Ensure logo exists

        // Check if required images exist
        if (!fs.existsSync(backgroundPath)) {
            throw new Error(`Background image not found at path: ${backgroundPath}`);
        }
        if (!fs.existsSync(logoPath)) {
            throw new Error(`Logo image not found at path: ${logoPath}`);
        }

        // Load images
        const [backgroundImage, logo] = await Promise.all([
            loadImage(backgroundPath),
            loadImage(logoPath)
        ]);

        const canvas = createCanvas(backgroundImage.width, backgroundImage.height);
        const ctx = canvas.getContext('2d');

        const encoder = new GIFEncoder(canvas.width, canvas.height);
        const gifPath = path.join(imgDir, `scan_${uuidv4()}.gif`);
        const gifStream = fs.createWriteStream(gifPath);
        encoder.createReadStream().pipe(gifStream);

        encoder.start();
        encoder.setRepeat(0); // 0 for repeat, -1 for no-repeat
        encoder.setDelay(50); // Frame delay in ms
        encoder.setQuality(10); // Image quality. Lower is better quality

        const totalFrames = 60;

        for(let frame = 0; frame < totalFrames; frame++) {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw background
            ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

            // Draw interface elements
            // (Insert your specific drawing code here for elements like drawConsoleOutput, drawScannerCircle, etc.)

            // Add the frame to GIF
            encoder.addFrame(ctx);
        }

        encoder.finish();

        // Wait for the stream to finish
        await new Promise((resolve, reject) => {
            gifStream.on('finish', resolve);
            gifStream.on('error', reject);
        });

        // Read the generated GIF
        const gifBuffer = fs.readFileSync(gifPath);
        // Optionally, delete the GIF after reading
        fs.unlinkSync(gifPath);

        return gifBuffer;
    } catch (error) {
        console.error('Error generating scan visualization:', error);
        throw error; // Re-throw the error after logging
    }
}

// Function to generate scan results using OpenAI
async function generateScanResults(type, location, parameters) {
    const prompt = `Generate detailed Star Trek-style sensor scan results for scanning ${location} using ${SCAN_TYPES[type].name}.
${parameters ? 'Additional parameters: ' + parameters + '\n' : ''}
Include:
1. A brief summary of findings (1-2 sentences)
2. Current status (single word or short phrase)
3. Key observations or anomalies (1-2 sentences)
4. Three specific measurements for ${SCAN_TYPES[type].metrics.join(', ')} (include units)

Format your response exactly as follows:
{
    "summary": "brief summary here",
    "status": "status here",
    "findings": "key findings here",
    "metrics": ["measurement 1", "measurement 2", "measurement 3"]
}`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are the computer of a starship performing sensor analysis. Provide detailed, scientific responses in the style of Star Trek."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        const responseText = completion.choices[0].message.content;

        // Parse the JSON response safely
        let response;
        try {
            response = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Error parsing JSON response:', parseError);
            console.error('Response Text:', responseText);
            throw new Error('Invalid response format from OpenAI.');
        }
        
        return {
            summary: response.summary || 'No summary available',
            status: response.status || 'Unknown',
            findings: response.findings || 'No findings available',
            metrics: Array.isArray(response.metrics) 
                ? response.metrics.map(m => m?.toString() || 'No data')
                : ['No data', 'No data', 'No data']
        };
    } catch (error) {
        console.error('Error generating scan results:', error);
        throw error;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sensor')
        .setDescription('Generates AI sensor readings with visual display')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of scan to perform')
                .setRequired(true)
                .addChoices(
                    { name: 'Quantum Scanner', value: 'QUANTUM' },
                    { name: 'Thermal Imaging', value: 'THERMAL' },
                    { name: 'Subspace Scanner', value: 'SUBSPACE' },
                    { name: 'Bio-Scanner', value: 'BIOLOGICAL' }
                ))
        .addStringOption(option =>
            option.setName('location')
                .setDescription('Location or object to scan')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('parameters')
                .setDescription('Additional scan parameters')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        const scanType = interaction.options.getString('type');
        const location = interaction.options.getString('location');
        const parameters = interaction.options.getString('parameters');

        try {
            // Validate scan type
            if (!SCAN_TYPES[scanType]) {
                return interaction.editReply({ 
                    content: 'Invalid scan type selected.',
                    ephemeral: true 
                });
            }

            // Send initial "scanning" message with loading animation
            const loadingPath = path.join(__dirname, '..', 'images', 'loading.webm');
            if (!fs.existsSync(loadingPath)) {
                return interaction.editReply({ 
                    content: 'Loading animation not found.', 
                    ephemeral: true 
                });
            }

            const loadingAttachment = new AttachmentBuilder(loadingPath, { name: 'loading.webm' });
            await interaction.editReply({ 
                content: `🔄 Initiating ${SCAN_TYPES[scanType].name.toLowerCase()} of **${location}**...`,
                files: [loadingAttachment]
            });

            // Generate scan results using OpenAI
            const scanResults = await generateScanResults(scanType, location, parameters);
            
            // Generate visualization
            const gifBuffer = await generateScanVisualization(scanType, scanResults, location);
            const resultAttachment = new AttachmentBuilder(gifBuffer, { name: 'scan_results.gif' });

            // Create embed with scan results
            const embed = new EmbedBuilder()
                .setTitle(`${SCAN_TYPES[scanType].name} Results`)
                .setDescription(scanResults.summary)
                .setColor(SCAN_TYPES[scanType].color)
                .addFields([
                    { name: 'Location', value: location, inline: true },
                    { name: 'Status', value: scanResults.status, inline: true },
                    { name: '\u200B', value: '\u200B', inline: true },
                    { name: 'Key Findings', value: scanResults.findings }
                ]);

            // Add metric fields
            scanResults.metrics.forEach((metric, index) => {
                embed.addFields({
                    name: SCAN_TYPES[scanType].metrics[index],
                    value: metric.toString(),
                    inline: true
                });
            });

            embed.setImage('attachment://scan_results.gif')
                .setFooter({ text: `Scan completed at ${new Date().toLocaleString()}` });

            // Update reply with results
            await interaction.editReply({
                content: null,
                embeds: [embed],
                files: [resultAttachment]
            });

        } catch (error) {
            console.error('Scan error:', error);
            await interaction.editReply({
                content: '❌ Error performing scan. Please try again later.',
                files: []
            });
        }
    }
};
