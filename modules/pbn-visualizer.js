class PBNVisualizer {
    constructor(ansiCodes = {}) {
        this.ansiCodes = ansiCodes;
        this.gameMap = {};
        this.correctedMap = [];
        this.colorCharMap = {
            '_': `${this.ansiCodes.BG_BRIGHT_GREEN} ${this.ansiCodes.RESET}`, // Grass
            '^': `${this.ansiCodes.BG_YELLOW}${this.ansiCodes.BLACK}${this.ansiCodes.BOLD}^${this.ansiCodes.RESET}`, // Mountain
            '#': `${this.ansiCodes.BG_CYAN}${this.ansiCodes.WHITE}~${this.ansiCodes.RESET}`, // Water
            '=': `${this.ansiCodes.BG_CYAN}${this.ansiCodes.WHITE}=${this.ansiCodes.RESET}`, // Water
            ':': `${this.ansiCodes.BG_CYAN}${this.ansiCodes.WHITE}:${this.ansiCodes.RESET}`, // Water
            '!': `${this.ansiCodes.BG_GREEN} ${this.ansiCodes.RESET}`, //Woodlands
            '&': `${this.ansiCodes.BG_GREEN}${this.ansiCodes.BLACK}J${this.ansiCodes.RESET}`,// Jungle
            'v': `${this.ansiCodes.BG_YELLOW}${this.ansiCodes.BLACK}${this.ansiCodes.BOLD}v${this.ansiCodes.RESET}`,// valley
            '/': `${this.ansiCodes.BG_YELLOW}${this.ansiCodes.WHITE}/${this.ansiCodes.RESET}`,// Desert
            '-': `${this.ansiCodes.BG_GREEN}${this.ansiCodes.BLACK}H${this.ansiCodes.RESET}`,// Hill
        };

        this.terrainTypes = {
            '_': 'Grass',
            '^': 'Mountain',
            '#': 'Water',
            '=': 'Water',
            ':': 'Water',
            '!': 'Woodlands',
            '&': 'Jungle',
            'v': 'Valley',
            '/': 'Desert',
            '-': 'Hill',
        };

        this.terrainCount = {
            'Grass': 0,
            'Mountain': 0,
            'Water': 0,
            'Woodlands': 0,
            'Jungle': 0,
            'Valley': 0,
            'Desert': 0,
            'Hill': 0,
        };

        this.terrainPercent = {
            'Grass': 0,
            'Mountain': 0,
            'Water': 0,
            'Woodlands': 0,
            'Jungle': 0,
            'Valley': 0,
            'Desert': 0,
            'Hill': 0,
        };

        this.terrainColors = {
            'Grass': [34, 139, 34],      // ForestGreen
            'Mountain': [139, 137, 137], // LightGray
            'Water': [28, 107, 160],     // SteelBlue
            'Jungle': [0, 100, 0],    // DarkGreen
            'Woodlands': [0, 128, 0],       // Green
            'Valley': [189, 183, 107], // DarkKhaki
            'Desert': [210, 180, 140],   // Tan
            'Hill': [160, 82, 45],       // Sienna
        };
    }

    setGameMap(mapData) {
        this.gameMap = mapData;
        this.correctedMap = this.generateInvertedGameMap(false); // Store non-colored map lines
    }

    isGameMapSet() {
        //Game map is now a complex object, not just lines
        return this.gameMap && this.gameMap.length > 0;
    }

    setTerrainCount() {

        const { lines } = this.gameMap;

        // Reset counts
        for (let terrain in this.terrainCount) {
            this.terrainCount[terrain] = 0;
        }

        if (!Array.isArray(lines) || lines.length === 0) {
            console.log('Game map is empty or invalid.');
            return;
        }

        let counter = 0;
        let rows = lines.length;
        let cols = lines[0].length;

        // Count terrain types
        for (let line of lines) {
            for (let char of line) {
                const terrain = this.terrainTypes[char];
                if (terrain) {
                    this.terrainCount[terrain]++;
                    counter++;
                }
            }
        }
        //console.log('Terrain Counts:', this.terrainCount);
        //console.log('Total Terrain Characters Counted:', counter);
        //console.log('Map Dimensions:', rows, 'rows x', cols, 'columns');
    }

    setTerrainPercent() {
        const total = Object.values(this.terrainCount).reduce((sum, count) => sum + count, 0);
        if (total === 0) {
            console.log('No terrain data to calculate percentages.');
            return;
        }
        for (let terrain in this.terrainCount) {
            this.terrainPercent[terrain] = ((this.terrainCount[terrain] / total) * 100).toFixed(2) + '%';
        }
        //console.log('Terrain Percentages:', this.terrainPercent);
    }

    setTerrainInfo() {
        this.setTerrainCount();
        this.setTerrainPercent();
    }

    getTerrainCount() {
        return this.terrainCount;
    }

    getTerrainPercent() {
        return this.terrainPercent;
    }

    generateInvertedGameMap(coloredMap = true) {
        const { lines } = this.gameMap;

        if (!Array.isArray(lines) || lines.length === 0) {
            console.log('Game map is empty or invalid.');
            return;
        }

        const height = lines.length;
        const width = lines[0].length;
        const halfHeight = Math.floor(height / 2);
        const halfWidth = Math.floor(width / 2);

        // Extract quadrants
        const TL = lines.slice(0, halfHeight).map(line => line.slice(0, halfWidth));
        const TR = lines.slice(0, halfHeight).map(line => line.slice(halfWidth));
        const BL = lines.slice(halfHeight).map(line => line.slice(0, halfWidth));
        const BR = lines.slice(halfHeight).map(line => line.slice(halfWidth));

        //console.log('Radially Inverted Game Map:');
        let exportedMap = [];
        // Top half: BR | BL
        for (let i = 0; i < halfHeight; i++) {
            const line = BR[i] + BL[i];
            // Replace characters with colored versions
            if (coloredMap) {
                const coloredLine = line.split('').map(char => this.colorCharMap[char] || char).join('');
                exportedMap.push(coloredLine);
            } else {
                exportedMap.push(line);
            }
        }

        // Bottom half: TR | TL
        for (let i = 0; i < halfHeight; i++) {
            const line = TR[i] + TL[i];
            // Replace characters with colored versions
            if (coloredMap) {
                const coloredLine = line.split('').map(char => this.colorCharMap[char] || char).join('');
                exportedMap.push(coloredLine);
            } else {
                exportedMap.push(line);
            }
        }

        return exportedMap; 
    }

    printMap(mapArray = [], coloredMap = true) {
        if (!mapArray || mapArray.length === 0) {
            console.log('Corrected map is empty or not set.');
            return;
        }
        //console.log('Corrected Game Map:');
        // Print with colors
        if (coloredMap) {
            mapArray.forEach(line => {
                const coloredLine = line.split('').map(char => this.colorCharMap[char] || char).join('');
                console.log(coloredLine);
            });
        } else {
            mapArray.forEach(line => console.log(line));
        }
        // Print without colors
        //this.correctedMap.forEach(line => console.log(line));
    }

    printTerrainInfo() {
        this.setTerrainInfo();
        console.log('Terrain Counts:', this.terrainCount);
        console.log('Terrain Percentages:', this.terrainPercent);
    }

    // Export map to a *.png file using an external library (e.g., 'pngjs')
    exportMapToPNG(filename = 'data/game_map.png', rawGameMap = false ,cellSize = 10) {
        const { PNG } = require('pngjs');
        const fs = require('fs');

        function getLines(rawGameMap) {
            if (rawGameMap) {
                return this.gameMap.lines;
            } else {
                return this.generateInvertedGameMap(false); // Get non-colored map lines for PNG export
            }
        }

        //const { lines } = this.gameMap;
        //const lines = this.printGameMap(false, true); // Get non-colored map lines for PNG export

        const lines = getLines.call(this, rawGameMap);

        if (!Array.isArray(lines) || lines.length === 0) {
            console.log('Game map is empty or invalid.');
            return;
        }

        const height = lines.length;
        const width = lines[0].length;

        const png = new PNG({ width: width * cellSize, height: height * cellSize });

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const char = lines[y][x];
                const terrain = this.terrainTypes[char];
                const color = this.terrainColors[terrain] || [0, 0, 0]; // Default to black if unknown

                for (let dy = 0; dy < cellSize; dy++) {
                    for (let dx = 0; dx < cellSize; dx++) {
                        const idx = ((y * cellSize + dy) * png.width + (x * cellSize + dx)) * 4;
                        png.data[idx] = color[0];     // Red
                        png.data[idx + 1] = color[1]; // Green
                        png.data[idx + 2] = color[2]; // Blue
                        png.data[idx + 3] = 255;          // Alpha
                    }
                }
            }
        }

        png.pack().pipe(fs.createWriteStream(filename)).on('finish', () => {
            //console.log(`Game map exported to ${filename}`);
        });
    }

    exportMapToFile(filename = 'data/game_map.txt', coloredMap = false) {
        const mapLines = this.generateInvertedGameMap(coloredMap);
        const fs = require('fs');
        // Check if file exists, if not, create it
        if (!fs.existsSync(filename)) {
            fs.writeFileSync(filename, '', 'utf8');
        }
        // If file exists, clear its contents
        else {
            fs.truncateSync(filename, 0);
        }
        // Write the map lines to the file
        fs.writeFileSync(filename, mapLines.join('\n'), 'utf8');
        //console.log(`Game map exported to ${filename}`);    
    }

    exportRawMapToFile(filename = 'data/raw_game_map.txt') {
        const { lines } = this.gameMap;
        if (!Array.isArray(lines) || lines.length === 0) {
            console.log('Game map is empty or invalid.');
            return;
        }
        const fs = require('fs');
        // Check if file exists, if not, create it
        if (!fs.existsSync(filename)) {
            fs.writeFileSync(filename, '', 'utf8');
        }
        // If file exists, clear its contents
        else {
            fs.truncateSync(filename, 0);
        }
        // Write the map lines to the file
        fs.writeFileSync(filename, lines.join('\n'), 'utf8');
        //console.log(`Raw game map exported to ${filename}`);    
    }

    addPlayerToCorrectedMap(row, col) {
        const originalLine = this.correctedMap[row];
        const updatedLine = originalLine.slice(0, col) + 'P' + originalLine.slice(col + 1);
        this.correctedMap[row] = updatedLine;
    }

    // === Convert logical coordinates to array indices
    // For getting array indexes of position on inverted map
    toArrayIndex(logicalX, logicalY) {
        const MAP_WIDTH = 150;
        const MAP_HEIGHT = 100;

        const X_OFFSET = Math.floor(MAP_WIDTH / 2);   // 75
        const Y_OFFSET = Math.floor(MAP_HEIGHT / 2);  // 50
        const col = (logicalX + X_OFFSET + MAP_WIDTH) % MAP_WIDTH;
        const row = (logicalY + Y_OFFSET + MAP_HEIGHT) % MAP_HEIGHT;

        return { row, col };
    }
}

module.exports = PBNVisualizer;