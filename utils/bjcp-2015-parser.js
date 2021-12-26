/**
 * This tools parses the XML representation of the BJCP Guidelines to JSON representation.
 * To run it, execute "node utils/bjcp-2015-parser.js" from root directory.
 */

const fs = require('fs');
const tiny = require('tiny-json-http');
const parseString = require('xml2js').parseString;
const util = require('util');

new (class {
    constructor() {
        try {
            this.load();
        } catch (err) {
            console.error(err);
        }
    }

    async load() {
        console.log('Loading XML source...');
        let response = await tiny.get({
            url: 'https://raw.githubusercontent.com/meanphil/bjcp-guidelines-2015/master/styleguide.xml'
        });

        console.log('Parsing XML...');
        parseString(response.body, {
            attrkey: '',
            charkey: 'text',
            trim: true,
            normalizeTags: true,
            emptyTag: null,
            mergeAttrs: true,
            explicitArray: false
        }, (err, result) => {
            if (err) {
                throw err;
            } else {
                this.parse(result.styleguide.class);
            }
        });
    }

    async parse(src) {
        console.log('Parsing BJCP data...');
        let data = {types: [], ['all-categories']: [], ['all-styles']: []};
        src.forEach(t => {
            let type = this.parseType(t);
            data.types.push(type);

            data[`${type.id}-categories`] = [];
            data[`${type.id}-styles`] = [];

            t.category.forEach(c => {
                let category = this.parseCategory(type.id, c);
                data['all-categories'].push(category);
                data[`${type.id}-categories`].push(category);

                c.subcategory.forEach(s => {
                    let style = this.parseStyle(type.id, category.id, s);
                    data['all-styles'].push(style);
                    data[`${type.id}-styles`].push(style);
                });
            });
        });

        console.log('Saving JSON files...');
        for (let name in data) {
            let filename = `./2015/${name}.json`;
            fs.writeFile(filename, JSON.stringify(data[name], null, 4), (err) => {
                if (err) {
                    throw err;
                }

                console.log(`Saved: ${filename}`);
            });
        }
    }

    parseType(data) {
        return {
            id: data.type,
            name: data.type.charAt(0).toUpperCase() + data.type.slice(1)
        };
    }

    parseCategory(typeId, data) {
        return {
            id: data.id,
            typeId: typeId,
            name: data.name,
            notes: data.notes
        };
    }

    parseStyle(typeId, categoryId, data) {
        return {
            id: data.id,
            typeId: typeId,
            categoryId: categoryId,
            name: data.name,
            ibuMin: this.parseNumber(data.stats.ibu.low),
            ibuMax: this.parseNumber(data.stats.ibu.high),
            ogMin: this.parseNumber(data.stats.og.low),
            ogMax: this.parseNumber(data.stats.og.high),
            fgMin: this.parseNumber(data.stats.fg.low),
            fgMax: this.parseNumber(data.stats.fg.high),
            srmMin: this.parseNumber(data.stats.srm.low),
            srmMax: this.parseNumber(data.stats.srm.high),
            abvMin: this.parseNumber(data.stats.abv.low),
            abvMax: this.parseNumber(data.stats.abv.high),
            aroma: data.aroma || null,
            appearance: data.appearance || null,
            flavor: data.flavor || null,
            mouthfeel: data.mouthfeel || null,
            impression: data.impression || null,
            comments: data.comments || null,
            history: data.history || null,
            ingredients: data.ingredients || null,
            comparison: data.comparison || null,
            examples: this.parseArrayString(data.examples),
            tags: this.parseArrayString(data.tags)
        };
    }

    parseNumber(value) {
        value = parseFloat(value);

        return isNaN(value) ? null : value;
    }

    parseArrayString(str) {
        return (str || '').split(',').map(s => s.trim()).filter(s => s !== '');
    }
})()