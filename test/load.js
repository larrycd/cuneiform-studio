const fs=require('fs'),path=require('path');const C=require('../src/app/engine.js');const D=path.join(__dirname,'..','src','app','data');
module.exports=(names=true)=>{C.loadGlyphs(JSON.parse(fs.readFileSync(path.join(D,'glyphs.json'),'utf8')));C.loadSigns(JSON.parse(fs.readFileSync(path.join(D,'signs.json'),'utf8')));
const n=C.loadLexicon(JSON.parse(fs.readFileSync(path.join(D,'lexicon.json'),'utf8')));if(names&&fs.existsSync(path.join(D,'names.tsv')))C.loadNames(fs.readFileSync(path.join(D,'names.tsv'),'utf8'));return [C,n];};
