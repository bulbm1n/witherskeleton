const mineflayer = require('mineflayer');
const { kill, exit } = require('process');
const readline = require('readline');
const vector = require('vec3');

var username = '';
var password = '';

var bot;

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => rl.question(query, answer => {
    rl.close();
    resolve(answer);
  }));
}

function askHidden(query) {
  return new Promise(resolve => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(query);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';

    stdin.on('data', char => {
      switch (char) {
        case '\r':
        case '\n':
        case '\u0004':
          stdout.write('\n');
          stdin.setRawMode(false);
          stdin.pause();
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          process.exit();
          break;
        case '\b':
        case '\x7f':
          password = password.slice(0, -1);
          break;
        default:
          password += char;
          break;
      }
    });
  });
}



function ray_intersection(entity,start,end){
	//checks to see if a ray going from start to end will intersect with entity
	let direction = end.minus(start)
	let t_min = vector((entity['position'].x-0.5*entity.width-start.x)/direction.x,
	(entity['position'].y-start.y)/direction.y,
	(entity['position'].z-0.5*entity.width-start.z)/direction.z
	)
	
	let t_max = vector((entity['position'].x+0.5*entity.width-start.x)/direction.x,
	(entity['position'].y+entity.height-start.y)/direction.y,
	(entity['position'].z+0.5*entity.width-start.z)/direction.z
	)
	
	let [t_min_x, t_max_x] = [Math.min(t_min.x, t_max.x), Math.max(t_min.x, t_max.x)]
    let [t_min_y, t_max_y] = [Math.min(t_min.y, t_max.y), Math.max(t_min.y, t_max.y)]
    let [t_min_z, t_max_z] = [Math.min(t_min.z, t_max.z), Math.max(t_min.z, t_max.z)]

    let t_near = Math.max(t_min_x, t_min_y, t_min_z)
    let t_far = Math.min(t_max_x, t_max_y, t_max_z)
	
	 /*//DEBUG BADF INTERSECTION STUFF
	console.log(direction)
	console.log(t_min)
	console.log(`t_min_x: ${t_min_x}`)
	console.log(`t_max_x: ${t_max_x}`)
	console.log(`t_min_y: ${t_min_y}`)
	console.log(`t_max_y: ${t_max_y}`)
	console.log(`t_min_z: ${t_min_z}`)
	console.log(`t_max_z: ${t_max_z}`)
	console.log(t_near)
	console.log(t_far)*/
	 
	if (t_near > t_far) {
		return NaN
	}
	if (t_far<0){
		return NaN
	}
	
	return t_near
	
}

function check_attack_entity(entity_name){
	//itters through entities and finds closest if there is one
	mobs = Object.keys(bot.entities).map(id => bot.entities[id]).filter(e => e.name.toLowerCase() === entity_name)//'wither_skeleton'
	let yaw = bot.entity.yaw
	let pitch = bot.entity.pitch
	//player camera is 1.62 above player coords
	let start = bot.entity['position'].plus(vector(0,1.62,0))
	end = start.plus(vector(-3*Math.abs(Math.cos(pitch))*Math.sin(yaw),3*Math.sin(pitch),-3*Math.abs(Math.cos(pitch))*Math.cos(yaw)))
	let close_dist = 1.1
	let close_entity
	mobs.forEach((mob) => {
		train = ray_intersection(mob,start,end)
		if (train<close_dist){
			close_dist = train
			close_ent = mob
		}
	})
	if (close_dist<=1){
		return close_ent
	} else{
		return null
	}
	//console.log(`Distance: ${close_dist}, Entity Location ${close_ent['position']}`)
}


async function onChat(message, messagePosition, jsonMsg, verified){
    if(message.getText().includes('???&')){
        bot.chat(`/g ZealFarm ${message.getText()}`)
        bot.quit()
        bot.off('message', onChat)
    }
}

async function attack_entity(){
	target = check_attack_entity('wither_skeleton')
			if(target !== null){
				bot.attack(target)
			}
}

async function onEnd(message){
    console.log(`Disconnect listner activated by: ${message}`)
    if(message != 'disconnect.quitting'){
		startBot()
		
    }
}
//moves food to the off hand and eats it
async function eating(food = 'minecraft:golden_carrot'){
    while (bot.food<20){
		//bot.chat('hungry')
		if (bot.inventory.slots[45] != null && bot.inventory.slots[45].name == 'golden_carrot'){
			await bot.activateItem(offHand=true)
			await bot.waitForTicks(60)
		} else{
			result = await select_item(nameKey='golden_carrot',check_durability=false,offHand=true)//.then(() => {bot.chat('eating'); bot.activateItem(offHand=true)})
			//bot.chat(`${result}`)
			if(!result){
				console.log('Out of Food')
				bot.quit()
			}
			//bot.chat('eating');
			await bot.activateItem(offHand=true)
			await bot.waitForTicks(60)
		}
	}
}

//finds an item in your inventory and sticks it into main hand or off hand, can also check for if the durability left is >10
async function select_item(nameKey, check_durability=false, offHand=false){
	let hand = 'hand'
	if (offHand){
		hand = "off-hand"
	}
	
	let items = await bot.inventory.items()
		//console.log(bot.inventory)
	for (const i of items){
		//console.log(`${i.name}`)
		if(nameKey == i.name){
			//bot.chat('item name found')
			if(check_durability){
				//bot.chat('check_dura trigger')
				if(i.maxDurability - i.durabilityUsed > 10){
					await bot.equip(i, hand)
					//bot.chat('i found it')
					return true
				}
			}else{
				//bot.chat('no dura')
				await bot.equip(i, hand)
				//bot.chat('i found it')
				return true
			}
		}
	}
	return false
}

//grabs a sword with more than 10dura on sticks in main hand
async function grab_sword(){
	//if(bot.heldItem.name == 'diamond_sword'){
	let main_hand = bot.heldItem
	if(main_hand){
		if(main_hand.name == 'diamond_sword'){
			if(!(main_hand.maxDurability - main_hand.durabilityUsed>10)){
				//get a sword!
				let result = await select_item('diamond_sword', check_durability=true)
				//bot.chat(`${result}`)
				if(!result){
					console.log('Out of Swords')
					bot.quit()
				}
			}
			
		} else{
			//get a sword!
			let result = await select_item('diamond_sword', check_durability=true)
			//bot.chat(`${result}`)
			if(!result){
				console.log('Out of Swords')
				bot.quit()
			}
		}
	} else{
		//get a sword!
		let result = await select_item('diamond_sword', check_durability=true)
		//bot.chat(`${result}`)
		if(!result){
			console.log('Out of Swords')
			bot.quit()
		}
	}
}


async function killCycle() {
	await bot.lookAt(vector(2812,32.3,8411.45))
	await bot.waitForTicks(1)
	attack_entity()
	await bot.waitForTicks(20)
	await bot.lookAt(vector(2811,32.25,8411.5))
	await bot.waitForTicks(1)
	attack_entity()
	await bot.waitForTicks(20)
	await eating()
	await grab_sword()
}

function startBot() {
	if (bot) cleanUpBot(bot); // ensure any old bot is cleaned up before creating a new one

    return new Promise((resolve, reject) => {
        const tempBot = mineflayer.createBot({
            host: 'play.civmc.net',
            port: 25565,
            auth: 'microsoft',
            username: username,
            password: password,
            version: '1.21.4',
            logErrors: false
        });

        tempBot.on('error', (err) => {
            if (err.code === 'ECONNREFUSED') {
                console.log('Failed to connect, retrying in 10 sec');
                setTimeout(() => resolve(null), 10000);
            } else if (err.code === 'ETIMEDOUT') {
                console.log('Connection timed out, retrying in 60 sec');
                setTimeout(() => resolve(null), 60000);
            } else {
                console.error('Unexpected error:', err);
                reject(err);
            }
        });

        tempBot.once('spawn', () => {
            console.log('World loaded, starting listeners');
            tempBot.on('message', onChat);
            tempBot.on('end', onEnd);
            tempBot.chat('/g ZealFarm Afking Wither Skele Farm');
            console.log('Bot Active');
            resolve(tempBot);
        });
    });
}

function cleanUpBot(botInstance) {
	if (!botInstance) return;
	try {
		botInstance.removeAllListeners();
		if (botInstance._client) botInstance._client.removeAllListeners();
		if (botInstance.quit) botInstance.quit();
	} catch (e) {
		console.error('Cleanup error:', e);
	}
}




async function main() {
	console.log('Bot Initializing');
  
	while (true) {
	  bot = await startBot();
	  if (!bot) continue;
  
	  console.log('Bot Running');
  
	  try {
		while (bot?.player) {
		  await killCycle();
		}
	  } catch (err) {
		console.error('Error during killCycle:', err);
	  }
  
	  console.log('Bot disconnected. Restarting...');
	  cleanUpBot(bot);
	  bot = null;
	}
  }
  


(async function init() {
	const args = process.argv.slice(2);
  
	if (args.includes('--prompt')) {
	  username = await askQuestion('Enter username: ');
	  password = await askHidden('Enter password (input hidden): ');
	} else if (args.length >= 2) {
	  [username, password] = args;
	} else {
	  console.error('Usage: node bot.js [--prompt] OR node bot.js <username> <password>');
	  exit(1);
	}
  
	main(); 
  })();