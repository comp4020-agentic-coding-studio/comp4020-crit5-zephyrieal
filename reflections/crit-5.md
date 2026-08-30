# Crit 5 reflection

**What was the breakthrough that moved the work forward?**

Treating the engine as something I could drive from a test file, not just from
the browser. Once `step()` was a pure function, I could hand it a full stack
of moves and assert on `state.phase`, which turned "is this room actually
beatable with a chasing enemy" from a question I reasoned through by hand into
one I could just run. That's what surfaced room 9's real bug — a 2-tile spawn
gap that made the escape mathematically impossible on the forced next move —
instead of me shipping a change that only looked fine on paper.

**What did this work change about who I want to be as a software developer?**

I used to treat "I traced through it by hand and it looks right" as good
enough for game logic, especially something as fiddly as chase-enemy pathing
with box-blocking side effects. Watching a hand-traced fix hold up while a
hand-traced enemy-repositioning had a real hole in it — one only a genuine
playthrough caught — changed that. Now, when a change's correctness depends on
several turns of interacting rules, I write the simulation instead of doing it
in my head, even for something that looks like a small data edit, like moving
one enemy's spawn tile two cells over.
