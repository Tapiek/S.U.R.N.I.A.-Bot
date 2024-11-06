function generateSensorDisplay(mode, result, location, query, detailed) {
    // Split result into lines for better display
    const lines = result.split('\n').filter(line => line.trim());
    const mainText = lines.join('\n');
    
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
        <!-- Background -->
        <rect width="800" height="600" fill="#000B1D"/>
        
        <!-- LCARS Header Bar -->
        <path d="M40,20 h720 a20,20 0 0 1 20,20 v30 h-760 v-30 a20,20 0 0 1 20,-20" 
              fill="${getColorByMode(mode)}" />
        
        <!-- Side Controls -->
        <rect x="20" y="90" width="60" height="120" rx="10" fill="#FF9C55"/>
        <rect x="20" y="220" width="60" height="160" rx="10" fill="#CC6699"/>
        <rect x="20" y="390" width="60" height="140" rx="10" fill="#FF9C55"/>
        
        <!-- Main Display Area -->
        <rect x="100" y="90" width="680" height="440" rx="15" 
              fill="rgba(0,40,80,0.3)" stroke="${getColorByMode(mode)}" stroke-width="2"/>
        
        <!-- Sensor Grid Background -->
        ${generateSensorGrid()}
        
        <!-- Scanning Animation -->
        <rect x="100" y="90" width="680" height="440" fill="url(#scanline)"/>
        
        <!-- Header Text -->
        <text x="120" y="45" fill="#000B1D" font-family="Arial" font-size="24" font-weight="bold">
            SENSOR ARRAY ${detailed ? 'DETAILED ANALYSIS' : 'STANDARD SCAN'}
        </text>
        
        <!-- Location and Query Display -->
        <text x="720" y="45" fill="#000B1D" font-family="Arial" font-size="18" text-anchor="end">
            ${location.toUpperCase()}
        </text>
        
        <!-- Main Content -->
        <text x="120" y="130" fill="#00FF00" font-family="monospace" font-size="14">
            <tspan x="120" dy="0">SCAN MODE: ${mode.toUpperCase()}</tspan>
            ${query ? `<tspan x="120" dy="20">FOCUS: ${query}</tspan>` : ''}
            <tspan x="120" dy="40">STATUS: ACTIVE</tspan>
            <tspan x="120" dy="20">━━━━━━━━━━━━━━━━━━━━━━━━━━━</tspan>
            ${wrapText(mainText, 60).map((line, i) => 
                `<tspan x="120" dy="20">${line}</tspan>`
            ).join('')}
        </text>

        <!-- Scanning Effect -->
        <defs>
            <linearGradient id="scanline" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="rgba(0,255,0,0)"/>
                <stop offset="0.5" stop-color="rgba(0,255,0,0.1)"/>
                <stop offset="1" stop-color="rgba(0,255,0,0)"/>
                <animate attributeName="y1" from="0" to="1" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="y2" from="0" to="1" dur="2s" repeatCount="indefinite"/>
            </linearGradient>
        </defs>
    </svg>`;
}

function getColorByMode(mode) {
    const colors = {
        standard: '#3399FF',
        lifeform: '#33CC33',
        energy: '#FFCC00',
        anomaly: '#FF3333'
    };
    return colors[mode] || '#3399FF';
}

function generateSensorGrid() {
    let grid = '';
    for(let i = 0; i < 20; i++) {
        for(let j = 0; j < 30; j++) {
            grid += `<rect x="${110 + j*22}" y="${100 + i*22}" 
                          width="20" height="20" fill="none" 
                          stroke="rgba(0,255,0,0.1)" stroke-width="1"/>`;
        }
    }
    return grid;
}

function wrapText(text, maxChars) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
        if ((currentLine + word).length > maxChars) {
            lines.push(currentLine);
            currentLine = word + ' ';
        } else {
            currentLine += word + ' ';
        }
    });
    if (currentLine) lines.push(currentLine);

    return lines;
}

module.exports = { generateSensorDisplay };