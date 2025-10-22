# Quick Testing Instructions - Phase 1 Coordinate Fix

## What Was Fixed

**Bug:** Ships moved ~50x too fast (crossing entire map in less than 1 turn)  
**Cause:** Coordinate system mismatch between map generation and ship speeds  
**Fix:** Use galactic coordinates (0-1,048,576) throughout, convert only for display

---

## Quick Test (2 minutes)

### Run the Game
```bash
cd /Users/edz/Documents/personal/galactica-4
./gad4  # or however you launch it
```

### Test Ship Movement Speed

1. **Click your home star** (usually yellow with population)
2. **Press 's'** to build a scout ship
3. **Press Tab 3-5 times** to advance turns until scout is built
4. **Click the scout ship** (triangle at your star)
5. **Click the enemy home star** to send scout there
6. **Press Tab 10-20 times** and watch the ship

**✅ PASS:** Ship slowly moves toward destination (takes 40-60 turns total)  
**❌ FAIL:** Ship arrives instantly or in 1-2 turns → Bug still exists

---

## Expected Behavior Changes

### Before Fix ❌
- Ships zip across map instantly
- Hard to follow ship movement
- Game too easy (instant travel)

### After Fix ✅
- Ships take many turns to reach destinations
- Can see ships traveling across map
- Travel time matters strategically

---

## If Something Looks Wrong

### Stars Don't Appear
- Check console for errors
- Verify game window opened (800x600)

### Can't Click Stars/Ships
- Try clicking directly on star centers
- Check console for error messages

### Ships Still Too Fast
- Clear any cached game data
- Restart from fresh launch
- Check console: `console.log(ship.speed)` should show ~16,500

---

## Console Commands to Verify

Open browser dev tools (if using web version) and check:

```javascript
// After map loads:
game.stars[0].x  // Should be ~100,000-900,000 (not 100-800)

// After building scout:
game.allShips[0].speed  // Should be ~16,500

// Travel time calculation:
// Distance between stars: ~650,000 units
// Scout speed: 16,500 units/turn
// Expected time: 650,000 / 16,500 = ~40 turns ✅
```

---

## Files Changed

- `src/js/map-generator.js` - Updated PIXELS_PER_SECTOR to 1024
- `src/js/game.js` - Removed premature coordinate conversion
- `src/js/display.js` - Added coordinate conversion for drawing

**No changes needed to:**
- `src/js/ship.js` - Movement logic unchanged
- `src/js/rules.js` - Speed calculations unchanged
- `src/js/star.js` - Star properties unchanged

---

## Success = Ships Take 40-60 Turns to Travel Between Home Stars

That's it! If that works, Phase 1 is complete. ✅

