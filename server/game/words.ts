import type { Category, Difficulty } from '../../shared/types.js';

export const WORDS: Record<Category, Record<Difficulty, string[]>> = {
  games: {
    easy: ['mario', 'pac-man', 'tetris', 'controller', 'joystick', 'sonic', 'creeper', 'coin', 'kirby', 'yoshi', 'pong', 'level up', 'boss', 'pikmin'],
    medium: ['minecraft', 'fortnite', 'zelda', 'among us', 'donkey kong', 'game over', 'power up', 'roblox', 'angry birds', 'space invaders', 'mushroom kingdom', 'treasure chest', 'health bar', 'checkpoint'],
    hard: ['fall guys', 'flappy bird', 'speedrun', 'respawn', 'loot box', 'victory royale', 'mario kart', 'animal crossing', 'pokeball', 'subway surfers', 'geometry dash', 'rage quit'],
  },
  heroes: {
    easy: ['batman', 'superman', 'robot', 'alien', 'cape', 'mask', 'laser', 'ufo', 'rocket', 'hulk', 'shield', 'spaceship'],
    medium: ['spider-man', 'iron man', 'wonder woman', 'captain america', 'lightsaber', 'thor', 'flash', 'black panther', 'cyborg', 'jetpack', 'force field', 'ray gun'],
    hard: ['time machine', 'teleporter', 'wolverine', 'deadpool', 'black hole', 'darth vader', 'kryptonite', 'infinity gauntlet', 'hologram', 'invisibility', 'mind control', 'wormhole'],
  },
  cartoons: {
    easy: ['spongebob', 'pikachu', 'mickey mouse', 'shrek', 'elsa', 'garfield', 'snoopy', 'patrick', 'nemo', 'olaf', 'bluey', 'peppa pig'],
    medium: ['scooby-doo', 'tom and jerry', 'bugs bunny', 'homer simpson', 'winnie the pooh', 'minion', 'dora', 'stitch', 'paw patrol', 'smurf', 'pink panther', 'squidward'],
    hard: ['phineas and ferb', 'powerpuff girls', 'tweety', 'road runner', 'popeye', 'gumball', 'ben 10', 'adventure time', 'johnny bravo', 'courage', 'wall-e', 'kung fu panda'],
  },
  snacks: {
    easy: ['burger', 'fries', 'pizza', 'hot dog', 'donut', 'taco', 'cookie', 'popcorn', 'chips', 'soda', 'candy', 'ice cream'],
    medium: ['nachos', 'milkshake', 'chicken nugget', 'pretzel', 'burrito', 'onion rings', 'cupcake', 'lollipop', 'corn dog', 'waffle', 'cheese puff', 'chocolate bar'],
    hard: ['happy meal', 'drive-thru', 'gummy bear', 'cotton candy', 'slushie', 'cinnamon roll', 'popsicle', 'churro', 'mozzarella stick', 'jelly bean', 'bubble tea', 'kebab'],
  },
  wildlife: {
    easy: ['lion', 'tiger', 'shark', 'snake', 'monkey', 'zebra', 'elephant', 'giraffe', 'crocodile', 'hippo', 'parrot', 'panda'],
    medium: ['sloth', 'toucan', 'flamingo', 'kangaroo', 'koala', 'cheetah', 'gorilla', 'peacock', 'jellyfish', 'octopus', 'penguin', 'rhino'],
    hard: ['chameleon', 'platypus', 'axolotl', 'narwhal', 'anteater', 'armadillo', 'komodo dragon', 'meerkat', 'red panda', 'manta ray', 'okapi', 'pufferfish'],
  },
  landscapes: {
    easy: ['sun', 'rain', 'snow', 'cloud', 'rainbow', 'mountain', 'beach', 'island', 'river', 'lake', 'wind', 'moon'],
    medium: ['volcano', 'tornado', 'waterfall', 'desert', 'lightning', 'canyon', 'glacier', 'forest', 'snowstorm', 'fog', 'cave', 'sunset'],
    hard: ['aurora', 'tsunami', 'avalanche', 'hurricane', 'oasis', 'sandstorm', 'thunderstorm', 'heatwave', 'rainforest', 'hailstorm', 'geyser', 'solar eclipse'],
  },
  verbs: {
    easy: ['run', 'jump', 'swim', 'sleep', 'eat', 'cry', 'sing', 'dance', 'read', 'laugh', 'wave', 'kick'],
    medium: ['juggling', 'fishing', 'sneezing', 'climbing', 'whistling', 'skiing', 'knitting', 'cooking', 'yawning', 'painting', 'skating', 'hugging'],
    hard: ['sleepwalking', 'eavesdropping', 'hiccuping', 'tiptoeing', 'shivering', 'stretching', 'surfing', 'vacuuming', 'bowling', 'meditating', 'sunbathing', 'tug of war'],
  },
  emotions: {
    easy: ['love', 'happy', 'sad', 'angry', 'scared', 'tired', 'cold', 'hot', 'hungry', 'bored', 'kiss', 'idea'],
    medium: ['surprise', 'jealous', 'confused', 'shy', 'proud', 'lonely', 'friendship', 'dream', 'time', 'music', 'luck', 'peace'],
    hard: ['freedom', 'nostalgia', 'karma', 'gravity', 'balance', 'infinity', 'embarrassed', 'heartbreak', 'teamwork', 'secret', 'memory', 'déjà vu'],
  },
  landmarks: {
    easy: ['eiffel tower', 'pyramid', 'big ben', 'castle', 'lighthouse', 'bridge', 'statue', 'windmill', 'igloo', 'temple', 'tower', 'stadium'],
    medium: ['statue of liberty', 'great wall', 'colosseum', 'taj mahal', 'leaning tower', 'mount rushmore', 'sphinx', 'golden gate', 'mount everest', 'stonehenge', 'hollywood sign', 'niagara falls'],
    hard: ['sydney opera house', 'christ the redeemer', 'machu picchu', 'burj khalifa', 'tower bridge', 'easter island', 'grand canyon', 'mount fuji', 'notre dame', 'empire state building', 'kremlin', 'petra'],
  },
  history: {
    easy: ['knight', 'castle', 'pirate', 'viking', 'dinosaur', 'caveman', 'king', 'queen', 'crown', 'sword', 'pharaoh', 'cowboy'],
    medium: ['pyramid', 'mummy', 'samurai', 'gladiator', 'ninja', 'chariot', 'catapult', 'armor', 'ship wreck', 'stone age', 'ice age', 'cannon'],
    hard: ['ancient egypt', 'roman empire', 'wild west', 'middle ages', 'renaissance', 'moon landing', 'steam engine', 'printing press', 'hieroglyphs', 'trojan horse', 'colosseum', 'industrial revolution'],
  },
  household: {
    easy: ['lamp', 'chair', 'bed', 'cup', 'spoon', 'fork', 'door', 'clock', 'key', 'sock', 'pillow', 'mirror'],
    medium: ['toaster', 'couch', 'toothbrush', 'fridge', 'umbrella', 'scissors', 'microwave', 'bathtub', 'candle', 'remote', 'ladder', 'kettle'],
    hard: ['vacuum cleaner', 'washing machine', 'chandelier', 'dishwasher', 'blender', 'ironing board', 'coat hanger', 'bunk bed', 'doorbell', 'hourglass', 'plunger', 'smoke alarm'],
  },
  brainrot: {
    easy: ['sus', 'npc', 'goat', 'aura', 'sigma', 'rizz', 'mid', 'cooked', 'slay', 'ohio', 'bruh', 'noob'],
    medium: ['skibidi toilet', 'mewing', 'fanum tax', 'no cap', 'bussin', 'delulu', 'glazing', 'main character', 'lil bro', 'chill guy', 'griddy', 'pookie'],
    hard: ['tung tung tung sahur', 'tralalero tralala', 'bombardiro crocodilo', 'ballerina cappuccina', 'brr brr patapim', 'six seven', 'aura farming', 'mogging', 'looksmaxxing', 'touch grass', 'sigma face', 'side eye'],
  },
  jobs: {
    easy: ['doctor', 'chef', 'pilot', 'teacher', 'farmer', 'police', 'nurse', 'baker', 'clown', 'artist', 'dentist', 'singer'],
    medium: ['firefighter', 'astronaut', 'mechanic', 'plumber', 'detective', 'lifeguard', 'magician', 'mail carrier', 'scientist', 'photographer', 'barber', 'builder'],
    hard: ['archaeologist', 'veterinarian', 'electrician', 'lumberjack', 'beekeeper', 'zookeeper', 'surgeon', 'referee', 'judge', 'deep sea diver', 'youtuber', 'flight attendant'],
  },
  flags: {
    easy: ['japan', 'canada', 'france', 'italy', 'usa', 'china', 'brazil', 'germany', 'mexico', 'egypt', 'india', 'spain'],
    medium: ['australia', 'england', 'ireland', 'sweden', 'greece', 'turkey', 'russia', 'argentina', 'switzerland', 'south korea', 'jamaica', 'poland'],
    hard: ['nepal', 'south africa', 'chile', 'portugal', 'norway', 'new zealand', 'kenya', 'vietnam', 'netherlands', 'ukraine', 'iceland', 'saudi arabia'],
  },
  movies: {
    easy: ['titanic', 'jaws', 'frozen', 'cars', 'up', 'shrek', 'batman', 'avatar', 'barbie', 'moana', 'coco', 'rocky'],
    medium: ['star wars', 'toy story', 'finding nemo', 'the lion king', 'harry potter', 'jurassic park', 'ghostbusters', 'king kong', 'spider-man', 'inside out', 'the incredibles', 'ratatouille'],
    hard: ['godzilla', 'the matrix', 'back to the future', 'lord of the rings', 'jumanji', 'home alone', 'pirates of the caribbean', 'the wizard of oz', 'monsters inc', 'despicable me', 'kung fu panda', 'night at the museum'],
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
