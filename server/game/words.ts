import type { Category, Difficulty } from '../../shared/types.js';

export const WORDS: Record<Category, Record<Difficulty, string[]>> = {
  animals: {
    easy: ['cat', 'dog', 'fish', 'bird', 'duck', 'frog', 'pig', 'bee', 'cow', 'snake', 'mouse', 'lion', 'owl', 'bear'],
    medium: ['penguin', 'giraffe', 'octopus', 'kangaroo', 'dolphin', 'jellyfish', 'hedgehog', 'peacock', 'flamingo', 'turtle', 'squirrel', 'zebra', 'crab', 'koala'],
    hard: ['chameleon', 'platypus', 'hibernation', 'camouflage', 'migration', 'anteater', 'narwhal', 'axolotl', 'porcupine', 'armadillo', 'seahorse', 'sloth'],
  },
  food: {
    easy: ['apple', 'banana', 'cake', 'pizza', 'egg', 'bread', 'cookie', 'carrot', 'cheese', 'grapes', 'milk', 'pear', 'corn', 'candy'],
    medium: ['hamburger', 'popcorn', 'sandwich', 'ice cream', 'hot dog', 'sushi', 'chocolate', 'pancake', 'spaghetti', 'taco', 'donut', 'watermelon', 'pretzel', 'lemonade'],
    hard: ['barbecue', 'fondue', 'smoothie', 'birthday cake', 'fortune cookie', 'gingerbread', 'avocado toast', 'dumpling', 'croissant', 'cotton candy', 'food fight', 'picnic'],
  },
  objects: {
    easy: ['ball', 'book', 'chair', 'hat', 'key', 'cup', 'door', 'bed', 'clock', 'lamp', 'shoe', 'sock', 'ring', 'spoon'],
    medium: ['umbrella', 'scissors', 'backpack', 'camera', 'toothbrush', 'magnet', 'anchor', 'telescope', 'compass', 'ladder', 'candle', 'guitar', 'balloon', 'hammer'],
    hard: ['chandelier', 'hourglass', 'kaleidoscope', 'microscope', 'typewriter', 'stethoscope', 'blueprint', 'metronome', 'periscope', 'boomerang', 'padlock', 'trampoline'],
  },
  places: {
    easy: ['house', 'school', 'park', 'beach', 'farm', 'zoo', 'shop', 'bank', 'road', 'bridge', 'island', 'city'],
    medium: ['castle', 'lighthouse', 'pyramid', 'igloo', 'airport', 'hospital', 'library', 'museum', 'stadium', 'jungle', 'desert', 'volcano'],
    hard: ['labyrinth', 'observatory', 'skyscraper', 'aquarium', 'cathedral', 'colosseum', 'amusement park', 'haunted house', 'submarine base', 'space station', 'treehouse', 'oasis'],
  },
  nature: {
    easy: ['sun', 'moon', 'star', 'tree', 'cloud', 'flower', 'leaf', 'rain', 'snow', 'fire', 'rock', 'wave'],
    medium: ['rainbow', 'tornado', 'waterfall', 'cactus', 'mushroom', 'lightning', 'mountain', 'river', 'snowflake', 'sunflower', 'cave', 'iceberg'],
    hard: ['avalanche', 'solar eclipse', 'thunderstorm', 'photosynthesis', 'constellation', 'black hole', 'aurora', 'tsunami', 'quicksand', 'mirage', 'gravity', 'earthquake'],
  },
  actions: {
    easy: ['run', 'jump', 'swim', 'sleep', 'eat', 'cry', 'sing', 'dance', 'read', 'smile', 'wave', 'fly'],
    medium: ['juggling', 'fishing', 'camping', 'painting', 'sneezing', 'climbing', 'whistling', 'skiing', 'knitting', 'shopping', 'cooking', 'yawning'],
    hard: ['sleepwalking', 'procrastination', 'hide and seek', 'meditation', 'brainstorm', 'daydreaming', 'eavesdropping', 'hiccups', 'tug of war', 'karaoke', 'recycling', 'sunbathing'],
  },
  fantasy: {
    easy: ['ghost', 'crown', 'wand', 'robot', 'alien', 'witch', 'magic', 'sword', 'dragon', 'elf', 'giant', 'monster'],
    medium: ['unicorn', 'mermaid', 'wizard', 'vampire', 'pirate', 'skeleton', 'zombie', 'genie', 'werewolf', 'treasure', 'fairy', 'potion'],
    hard: ['time machine', 'invisibility', 'telepathy', 'doppelganger', 'phoenix', 'centaur', 'minotaur', 'leprechaun', 'teleportation', 'crystal ball', 'haunted', 'superpower'],
  },
  sports: {
    easy: ['goal', 'bat', 'net', 'kick', 'race', 'golf', 'swing', 'medal', 'skate', 'bike', 'team', 'whistle'],
    medium: ['basketball', 'bowling', 'skateboard', 'surfing', 'tennis', 'boxing', 'archery', 'hockey', 'marathon', 'trophy', 'baseball', 'snowboard'],
    hard: ['referee', 'cheerleader', 'pole vault', 'high jump', 'gymnastics', 'wrestling', 'scuba diving', 'skydiving', 'water polo', 'photo finish', 'penalty kick', 'olympics'],
  },
  tech: {
    easy: ['phone', 'tv', 'mouse', 'radio', 'laptop', 'robot', 'battery', 'plug', 'game', 'email', 'wifi', 'cable'],
    medium: ['computer', 'keyboard', 'headphones', 'satellite', 'drone', 'printer', 'joystick', 'password', 'microphone', 'rocket', 'charger', 'website'],
    hard: ['artificial intelligence', 'virus', 'firewall', 'hologram', 'virtual reality', 'algorithm', 'blockchain', 'selfie stick', 'social media', 'livestream', 'download', 'emoji'],
  },
};

/** Compound words for Duo mode: drawer A draws the first part, drawer B the second. */
export const COMPOUNDS: [string, string][] = [
  ['space', 'ship'], ['sun', 'flower'], ['star', 'fish'], ['rain', 'bow'], ['fire', 'fly'], ['snow', 'man'],
  ['butter', 'fly'], ['cup', 'cake'], ['pan', 'cake'], ['tooth', 'brush'], ['foot', 'ball'], ['basket', 'ball'],
  ['light', 'house'], ['tree', 'house'], ['dog', 'house'], ['water', 'fall'], ['jelly', 'fish'], ['sword', 'fish'],
  ['horse', 'shoe'], ['pop', 'corn'], ['ear', 'ring'], ['key', 'board'], ['skate', 'board'], ['fire', 'truck'],
  ['bed', 'room'], ['mush', 'room'], ['hand', 'bag'], ['sea', 'horse'], ['moon', 'light'], ['rattle', 'snake'],
  ['scare', 'crow'], ['wind', 'mill'], ['rain', 'coat'], ['door', 'bell'], ['eye', 'glasses'], ['hot', 'dog'],
  ['bull', 'frog'], ['dragon', 'fly'], ['cow', 'boy'], ['sand', 'castle'], ['snow', 'ball'], ['tooth', 'paste'],
  ['bird', 'cage'], ['lady', 'bug'], ['pine', 'apple'], ['honey', 'bee'], ['fish', 'bowl'], ['mail', 'box'],
];
