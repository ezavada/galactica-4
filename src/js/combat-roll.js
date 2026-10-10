// V3 AGalacticThingy::GetOneAttackAgainst: three bounded damage rolls.
function attackDamage(strength){
    const rolls=(pdg.rand()%100)+(pdg.rand()%98)+(pdg.rand()%99)+3;
    return Math.max(0,Math.floor(strength*rolls/300));
}
module.exports={attackDamage};
