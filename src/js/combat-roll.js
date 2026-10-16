// V3 AGalacticThingy::GetOneAttackAgainst: three bounded damage rolls.
const Random=require('./simulation-random.js');
function attackDamage(strength,game){
    const rolls=Random.integer(100,game)+Random.integer(98,game)+Random.integer(99,game)+3;
    return Math.max(0,Math.floor(strength*rolls/300));
}
module.exports={attackDamage};
