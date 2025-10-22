# Testing Guide - All 5 Phases Complete

## Quick Test (5 minutes)

### 1. Start the Game
```bash
cd /Users/edz/Documents/personal/galactica-4
./gad4
```

### 2. Check Startup Messages

**Look for:**
```
Game config: 2 players (1 human, 1 AI), Small Sparse map, AI: Good
Player 1: You - Human
Player 2: Alpha Pact - Computer (Good)
MapGenerator: Assigned Alpha to player 1 (colony ship at 99%)
MapGenerator: Assigned Beta to player 2 (colony ship at 99%)
```

✅ **Phase 2 & 3:** Configuration and computer names working

---

### 3. Check Home Star

**Select your home star (click on it)**

**Verify:**
- [ ] Star is yellow (has population)
- [ ] Shows "Building: colony" 
- [ ] Progress bar at ~99%
- [ ] Population shows non-zero
- [ ] Tech level shows 1

✅ **Phase 5:** Star initialization working

---

### 4. Wait for Colony Ship

**Press Tab 1-2 times**

**Look for console message:**
```
You built your first colony ship!
```

✅ **Phase 4:** Ship type tracking working

---

### 5. Build a Scout Ship

**With home star selected, press 's'**

**Press Tab several times until scout completes**

**Look for console message:**
```
You built your first scout ship!
```

✅ **Phase 4:** Multiple ship types tracked

---

### 6. Send Scout to Travel

**Click the scout ship, then click on enemy star**

**Press Tab 10-20 times**

**Verify:**
- [ ] Scout moves slowly across map
- [ ] Takes many turns to arrive
- [ ] NOT instant!

✅ **Phase 1:** Coordinate system fix working

---

### 7. Research Tech (Optional - takes many turns)

**Let the game run for 15-30 turns**

**Look for console message:**
```
You reached star tech level 2!
```

✅ **Phase 4:** Tech milestone tracking working

---

## Expected Console Output (Full Session)

```
=== Galactica-4 PDG Game Starting ===
Game config: 2 players (1 human, 1 AI), Small Sparse map, AI: Good
Game initialized with 24 stars
Player 1: You - Human  
Player 2: Alpha Pact - Computer (Good)
MapGenerator: Assigned Alpha to player 1 (colony ship at 99%)
MapGenerator: Assigned Beta to player 2 (colony ship at 99%)

=== Start of Turn 1 ===
[End turn]

=== End of Turn 1 ===
=== Start of Turn 2 ===
[End turn]

=== End of Turn 2 ===
You built your first colony ship!  ← Phase 4 working!
Alpha Pact built their first colony ship!

[Build scout at home star]
[End turns...]

=== End of Turn 7 ===
You built your first scout ship!  ← Phase 4 working!

[Send scout to enemy star]
[End turns...]

Turn 8: Scout at position (150000, 200000)
Turn 9: Scout at position (165000, 215000)
Turn 10: Scout at position (180000, 230000)
[etc - slow movement]  ← Phase 1 working!

[Many turns later...]

=== End of Turn 18 ===
You reached star tech level 2!  ← Phase 4 working!
```

---

## Success Checklist

### ✅ All Phases Working If You See:

1. **Phase 1 (Coordinates):**
   - [ ] Ships take 40-60 turns to cross map
   - [ ] Not instant travel

2. **Phase 2 (Configuration):**
   - [ ] Console shows game config description
   - [ ] Can change settings in main.js

3. **Phase 3 (Names):**
   - [ ] Computer players have cool names
   - [ ] "Alpha Pact", "Beta Alliance", etc.

4. **Phase 4 (Tracking):**
   - [ ] "built their first X ship!" messages
   - [ ] "reached star tech level X!" messages
   - [ ] Console shows milestone achievements

5. **Phase 5 (Initialization):**
   - [ ] Colony ship visible at start
   - [ ] Shows 99% progress
   - [ ] Completes in 1-2 turns
   - [ ] No errors at startup

---

## Common Issues

### Issue: No Colony Ship Visible
**Symptom:** Home star shows "Building: None"  
**Cause:** Game not loading properly  
**Fix:** Restart game

### Issue: Ships Move Too Fast
**Symptom:** Ships arrive in 1-2 turns  
**Cause:** Phase 1 not applied  
**Fix:** Check coordinate system changes

### Issue: No Milestone Messages
**Symptom:** Ships complete but no console message  
**Cause:** Phase 4 not applied  
**Fix:** Check star.js and game.js changes

### Issue: Computer Player No Name
**Symptom:** Shows "Player 2: undefined"  
**Cause:** Phase 3 not applied  
**Fix:** Check map-generator.js changes

---

## Quick Verification Commands

**If you have console access:**

```javascript
// Check computer player name
game.players[2].name  // Should be "Alpha Pact" or similar

// Check home star has ship
game.stars[0].currentShip  // Should not be null

// Check ship at 99%
game.stars[0].currentShip.progress  // Should be 99

// Check entity IDs
game.stars[0].id  // Should be positive integer
game.allShips[0].id  // Should be positive integer

// Check player info
game.players[1].getStatistics()  // Should show player stats
```

---

## Performance Check

**Game should:**
- Start in < 2 seconds
- No lag when ending turns
- Smooth ship movement
- No console errors
- No memory leaks

---

## Complete = All Messages Show

If you see these console messages, **all 5 phases are working:**

1. ✅ "Game config: 2 players..." (Phase 2)
2. ✅ "Player 2: Alpha Pact" (Phase 3)
3. ✅ "colony ship at 99%" (Phase 5)
4. ✅ "built their first X ship!" (Phase 4)
5. ✅ Ships move slowly (Phase 1)

**If all 5 work, the port is complete!** 🎉

---

## Next: Play the Game!

All phases complete means:
- Game is fully playable
- All original features ported
- Ready for AI integration
- Ready for additional features

**Enjoy your working Galactica port!** 🚀

