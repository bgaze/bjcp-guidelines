/**
 * This tools parses the XML representation of the BJCP Guidelines to JSON representation.
 * To run it, execute "node utils/bjcp-2015-parser.js" from root directory.
 */

const fs = require('fs');
const readline = require('readline');

new (class {
    constructor() {
        this.category = null;
        this.style = null;
        this.styleKey = null;
        this.historicalBeerIndex = 'A';
        this.specialtyIpaIndex = 'a';

        this.categories = {};
        this.styles = {};

        try {
            this.load();
        } catch (err) {
            console.error(err);
        }
    }

    async load() {
        const fileStream = fs.createReadStream('./utils/2021-beer.txt');

        const rl = readline.createInterface({input: fileStream, crlfDelay: Infinity});

        for await (let line of rl) {
            this.parse(line);
        }

        this.categories = Object.values(this.categories).map(category => this.normalizeCategory(category));

        this.styles = Object.values(this.styles).map(style => this.normalizeStyle(style));

        fs.writeFile('./2021/beer-categories.json', JSON.stringify(this.categories, null, 4), (err) => {
            if (err) throw err;
            console.log(`Saved: categories`);
        });

        fs.writeFile('./2021/beer-styles.json', JSON.stringify(this.styles, null, 4), (err) => {
            if (err) throw err;
            console.log(`Saved: styles`);
        });
    }

    parse(raw) {
        let line = raw.trim();

        if (line !== '') {
            let parsed;
            if (parsed = /^Specialty IPA:\s+(.+)/.exec(line)) {
                this.initStyle(`21B${this.specialtyIpaIndex}`, parsed[1].trim(), '21B');
                this.specialtyIpaIndex = String.fromCharCode(this.specialtyIpaIndex.charCodeAt(0) + 1);
            } else if (parsed = /^Historical Beer:\s+(.+)/.exec(line)) {
                this.initStyle(`${this.category}${this.historicalBeerIndex}`, parsed[1].trim());
                this.historicalBeerIndex = String.fromCharCode(this.historicalBeerIndex.charCodeAt(0) + 1);
            } else if (parsed = /^(\d+[A-Z])\.\s+(.+)/.exec(line)) {
                this.initStyle(parsed[1].trim(), parsed[2].trim());
            } else if (parsed = /^(\d+)\.\s+(.+)/.exec(line)) {
                this.initCategory(parsed[1].trim(), parsed[2].trim());
            } else if (this.style) {
                this.parseStyleLine(line);
            } else {
                this.categories[this.category].notes.push(line);
            }
        }
    }

    initCategory(id, name) {
        this.category = id;
        this.style = null;
        this.categories[id] = {
            id: id,
            typeId: 'beer',
            name: name,
            notes: []
        }
    }

    initStyle(id, name, parentStyleId) {
        this.style = id;
        this.styleKey = 'description';

        this.styles[id] = {
            id: id,
            typeId: 'beer',
            categoryId: this.category,
            parentStyleId: parentStyleId || null,
            name: name,
            description: [],
            ibuMin: null,
            ibuMax: null,
            ogMin: null,
            ogMax: null,
            fgMin: null,
            fgMax: null,
            srmMin: null,
            srmMax: null,
            abvMin: null,
            abvMax: null,
            aroma: [],
            appearance: [],
            flavor: [],
            mouthfeel: [],
            impression: [],
            comments: [],
            history: [],
            ingredients: [],
            comparison: [],
            examples: [],
            tags: [],
            statistics: []
        }
    }

    parseStyleLine(line) {
        let patterns = [
            {pattern: 'Overall Impression', key: 'impression'},
            {pattern: 'Aroma', key: 'aroma'},
            {pattern: 'Appearance', key: 'appearance'},
            {pattern: 'Flavor', key: 'flavor'},
            {pattern: 'Mouthfeel', key: 'mouthfeel'},
            {pattern: 'Comments', key: 'comments'},
            {pattern: 'History', key: 'history'},
            {pattern: 'Characteristic Ingredients', key: 'ingredients'},
            {pattern: 'Style Comparison', key: 'comparison'},
            {pattern: 'Vital Statistics', key: 'statistics'},
            {pattern: 'Commercial Examples', key: 'examples'},
            {pattern: 'Tags', key: 'tags'}
        ];

        let value = line;
        patterns.every(p => {
            let parsed = new RegExp(`^${p.pattern}:\\s+(.+)`).exec(line);
            if (parsed) {
                this.styleKey = p.key;
                value = parsed[1].trim();
                return false;
            }
            return true;
        });
        this.styles[this.style][this.styleKey].push(value);
    }

    normalizeCategory(category) {
        category.notes = category.notes.length ? category.notes.join('\n') : null;
        return category;
    }

    normalizeStyle(style) {
        if (style.statistics.length && this.parseStyleStatistics(style)) {
            style.description.push('Vital Statistics :', ...style.statistics);
        }
        delete style.statistics;

        for (let key in style) {
            if (Array.isArray(style[key])) {
                style[key] = style[key].length ? style[key].join('\n') : null;
            }
        }

        style.tags = style.tags ? this.parseArrayString(style.tags) : [];

        style.examples = style.examples ? this.parseArrayString(style.examples) : [];

        return style;
    }

    parseStyleStatistics(style) {
        let pattern = /OG: ([\d.]+) – ([\d.]+) IBUs: ([\d.]+) – ([\d.]+) FG: ([\d.]+) – ([\d.]+) SRM: ([\d.]+) – ([\d.]+) ABV: ([\d.]+) – ([\d.]+)%/;
        let normalized = style.statistics.join(' ').replace(/\s+/g, ' ');
        let addToDescription = false;

        if (style.id === '23F') {
            pattern = /OG: ([\d.]+) – ([\d.]+) IBUs: ([\d.]+) – ([\d.]+) FG: ([\d.]+) – ([\d.]+) SRM: ([\d.]+) – ([\d.]+) .+ ABV: ([\d.]+) – ([\d.]+)%/;
            addToDescription = true;
        } else if (style.id === '25B') {
            pattern = /([\d.]+) – ([\d.]+) .+ IBUs: ([\d.]+) – ([\d.]+) FG: ([\d.]+) – ([\d.]+) .+ SRM: ([\d.]+) – .+ ABV: ([\d.]+) – [\d.]+% .+ [\d.]+ – ([\d.]+) .+ [\d.]+ – [\d.]+% .+ [\d.]+ – ([\d.]+)% .+/;
            addToDescription = true;
        }

        let parsed = pattern.exec(normalized);
        if (parsed) {
            style.ogMin = parseFloat(parsed[1]);
            style.ogMax = parseFloat(parsed[2]);
            style.ibuMin = parseFloat(parsed[3]);
            style.ibuMax = parseFloat(parsed[4]);
            style.fgMin = parseFloat(parsed[5]);
            style.fgMax = parseFloat(parsed[6]);
            style.srmMin = parseFloat(parsed[7]);
            style.srmMax = parseFloat(parsed[style.id === '25B' ? 8 : 9]);
            style.abvMin = parseFloat(parsed[style.id === '25B' ? 7 : 9]);
            style.abvMax = parseFloat(parsed[10]);
        } else {
            addToDescription = true;
        }

        return addToDescription;
    }

    parseNumber(value) {
        value = parseFloat(value);

        return isNaN(value) ? null : value;
    }

    parseArrayString(str) {
        return (str || '').split(',').map(s => s.trim()).filter(s => s !== '');
    }
})()