// Slims down exercises.json from hasaneyldrm/exercises-dataset (17 MB -> ~1 MB)
const fs = require('fs');
const src = process.argv[2];
const all = JSON.parse(fs.readFileSync(src, 'utf8'));
const out = all.map((e) => ({
  id: e.id,
  name: e.name,
  bodyPart: e.body_part,
  equipment: e.equipment,
  target: e.target,
  secondary: e.secondary_muscles || [],
  steps: { en: e.instruction_steps.en, fr: e.instruction_steps.fr },
  image: e.image,
  gif: e.gif_url,
}));
fs.writeFileSync('src/data/exercises.json', JSON.stringify(out));
console.log(out.length, 'exercises');
