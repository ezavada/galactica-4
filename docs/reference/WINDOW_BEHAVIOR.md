# Application window behavior

Game-wide windows (commands, open games, Compare Players, your systems, fleets, settings, view, map display, colony defaults and turn confirmation) are modal. Their own controls may focus or zoom the map. Outside mouse clicks play the existing NoMore clunk (sound 1012), subject to the sound setting, and do not select objects, issue orders, pan, or advance turns. Map wheel zoom is blocked while these windows are open.

These windows and startup/file dialogs use a nearly white to light grey surface, black text and controls, and a gold border with bright upper/left and shaded lower reflection accents. Object inspectors retain their owner tint. Events retains its neutral dark surface and is non-modal: map input outside it remains available.

All window title areas can be dragged, including Events, object inspectors, production/course/rename dialogs and foreground event reports. Dragging moves controls together with the panel. Windows stay within the drawing port. Startup dialogs recover capture on release or Escape; game windows also end capture when the viewport changes.

Application positions are configuration preferences, independent of saved simulation state. Browser storage uses `galactica.windowPosition.<name>`; native configuration uses `windowPosition.<name>` in the Galactica configuration. Each stores finite x/y coordinates. Invalid or unavailable preferences fall back to default layout. Restored bounds are constrained to the current port. Fleet and system tables continue to use their existing persistent geometry preferences, including height. Object and Events positions last for the current game and are not written as application defaults.

No new visible strings are introduced; existing translations remain in use for English, German, Spanish, French, Japanese and Russian.

Button shortcuts use the icon buttons' compact hint treatment: a separate small, right-aligned key label, with no angle brackets in the button caption. This applies to map/inspector/window buttons, startup Start/title controls, and text/file-dialog buttons. Existing translated strings with leading or trailing shortcut tokens are decoded only for button presentation; prose help remains intact. Button measurements reserve room for both label and key, including multi-character icon shortcuts. White-button outlines and non-modal panel borders use 50% alpha; the modal gold edging retains its reflective accents.

All tooltips share a white surface at 75% alpha, no border, 4px corner rounding and solid dark grey text. Immediate icon/table hints and delayed control help (including startup and file dialogs) use the same 20px equilateral triangle as object inspectors, oriented toward the hovered subject. Tooltip placement leaves room for the pointer and keeps the body inside the drawing port.

Map navigation uses a 240ms whip pan with fast acceleration and braking. Home, selected-object centering, tables, event/report navigation, attention and tutorial focus all share the display centering path; fit/reset also animate their location change. New destinations start from the sampled current pose. Dragging, scroll bars and zoom cancel pending motion. Initial framing and reduced-motion preferences use immediate centering. The rendered camera pose also drives hit testing, backgrounds and scroll bars; animation changes no game objects or simulation randomness.

System and ship inspectors outline the exposed sides of their pointers instead
of drawing a straight border through the attachment. System coordinates are
replaced by an inline Send to row with measured Set/Clear buttons; ship Location
is hidden. Both old coordinate rows remain commented in source. Production
locks use bare cached glyphs; the compact = control sits beside the sliders and
uses = as its shortcut. Public system pause actions and the Continuous caption
are removed. Build-button hover headings describe switching production.
