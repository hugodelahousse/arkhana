# Tarot Description Review: Grounding Document

This document is the reference for reviewing spread-position-specific card descriptions
in `app/lib/card-position-descriptions-{a,b,c}.ts`. Reviewers should use it to check
whether each description accurately reflects both the card's traditional meaning **and**
the position's specific thematic question.

---

## Review Criteria

A good spread-position description:
1. **Accurately reflects the card's traditional meaning** — not a generic positive gloss.
   Difficult cards (Death, Tower, Devil, Five of Cups, etc.) should still reflect their
   challenge, not be softened beyond recognition.
2. **Is genuinely specific to the position** — "mind" should be about cognitive state/thought
   patterns, not physical energy; "body" should be about embodiment, not spiritual wisdom.
   A description that could work for any position fails this test.
3. **Matches the spread's overall frame** — new-moon positions are forward-facing/intentional;
   full-moon positions are retrospective/completional. Don't mix the energies.
4. **Maintains the app's voice** — literary, dark-fantasy, 1–2 tight sentences, direct address
   or declarative. No generic self-help language ("embrace your journey", "step into your power").
5. **Doesn't contradict the card's reversed meaning** — upright and reversed descriptions exist
   elsewhere; the position descriptions assume upright unless noted.

---

## The Three Spreads & Their Positions

### Sunday Weekly — "Mind · Body · Spirit · Action"
*Frame: The week ahead. Four axes of being, each illuminated by one card.*

| Key | Label | What it asks | Expected description tone |
|-----|-------|-------------|--------------------------|
| `mind` | Mind | What is the card's message about your mental/cognitive state for the coming week? Thought patterns, mental clarity, intellectual approach, what the mind needs to examine or release. | Cognitive, cerebral, about thoughts/perception |
| `body` | Body | What does this card say about physical energy, embodiment, health, or what the body needs? Where tension lives, how to work with physical vitality or limitation. | Grounded, physical, somatic |
| `spirit` | Spirit | What does this card say about the soul's longing, spiritual state, or inner life this week? Connection to something larger, intuitive knowing, what the spirit is tending. | Inward, transcendent, soul-level |
| `action` | Action | Given this card, what is the single concrete guiding action for the week? Must be actionable — the card translated into *doing*. | Directive, specific, practical verb-driven |

**Common pitfall**: The "action" position should not be philosophical — it must translate into behavior. "Sit with uncertainty" is marginal; "name one thing you've been avoiding and address it directly" is better.

---

### New Moon — "Seeds of Intention"
*Frame: A new lunar cycle. Planting. The fertile dark before anything has grown.*

| Key | Label | What it asks | Expected description tone |
|-----|-------|-------------|--------------------------|
| `the gift` | The Gift | What energy or theme does this card bring *as a gift* to this cycle? The inherent quality of the card as an offering, not a task. | Receptive, welcoming, the card as resource |
| `what to release` | What to Release | What does this card invite you to compost from the last cycle? What pattern, belief, or energy is the card pointing at as ready to be let go? | Letting go, surrender, composting the old |
| `the seed` | The Seed | What intention does this card suggest planting? The card's positive potential as something deliberately cultivated. | Generative, potentiality, deliberate beginning |
| `the obstacle` | The Obstacle | What resistance does this card warn about as the seed grows? The shadow or challenge the card might manifest as. | Shadow-aware, honest about difficulty |
| `first steps` | First Steps | What first concrete action does this card suggest? Bridges intention to behavior. | Concrete, small, initiating |

**Common pitfall**: "The seed" shouldn't be the same as "what to release" restated positively. They're distinct: release is the outgoing; seed is the incoming. Also, the obstacle position must name a *genuine* challenge, not just the card rephrased as a caution.

---

### Full Moon — "Illumination & Release"
*Frame: A lunar cycle completing. Harvest, revelation, and surrender.*

| Key | Label | What it asks | Expected description tone |
|-----|-------|-------------|--------------------------|
| `what has grown` | What Has Grown | What has this card's energy brought to fruition since the new moon? The fruit of the cycle now visible. | Retrospective, acknowledging, harvest |
| `what is illuminated` | What Is Illuminated | What truth does this card now reveal clearly? What was in shadow is now fully lit. | Revelatory, clear-eyed, truth-naming |
| `what hides in the light` | What Hides in the Light | Even under full illumination, what shadow does this card point to? The blind spot, the thing still avoided even when everything seems visible. | Paradoxical, shadow-facing, uncomfortable |
| `what must be released` | What Must Be Released | What does this card say is complete and ready to be set down? Not what *should* be released in theory — what is *finished*, done, ripe for composting. | Completional, letting go, not clinging |
| `how to let go` | How to Let Go | What does this card suggest about the *manner* or practice of surrender? Not just "release it" — how, specifically. | Practical, processual, gentle or clear |
| `what emerges` | What Emerges | As this cycle closes, what does this card suggest is stirring at the edges? The first hint of the next cycle, not a full new beginning but a seed appearing. | Liminal, beginning-at-the-edge, forward-leaning |

**Common pitfall**: "What has grown" and "what is illuminated" are often confused. "What has grown" = the actual result/fruit of the cycle. "What is illuminated" = the truth now visible, which may or may not be the same as what grew (it could be a recognition *about* what grew). Also, "what hides in the light" must genuinely be a shadow — not just a softer restatement of illumination.

---

## The 78 Cards: Traditional Meanings & Key Themes

### MAJOR ARCANA

**0 — The Fool**
- *Upright*: New beginnings, innocence, leap of faith, unlimited potential, spontaneity, trust in the universe. The soul at the start of its journey. Zero: potential before form.
- *Reversed*: Recklessness, naivety, poor planning, hesitation at the threshold, fear of beginning.
- *Core tension*: The Fool's gift is trust without knowing; the shadow is that this same quality becomes recklessness. In positions about release or obstacle, this card often points at over-planning or the refusal to begin. In "first steps" and "action" it is always a call to just start.

**1 — The Magician**
- *Upright*: Willpower, manifestation, all four elements/tools available, focused intent, the channel between heaven and earth (as above, so below), agency.
- *Reversed*: Manipulation, scattered energy, unused potential, misdirected will, all tools present but nothing made.
- *Core tension*: Power is available but must be directed. "Body" for the Magician is about physical capacity channelled by will. "What must be released" (full moon) often points at the performance of competence vs. actual use of it.

**2 — The High Priestess**
- *Upright*: Intuition, mystery, the unconscious, silence before speech, the veil between worlds, inner knowing that bypasses logic, patience, the lunar cycle.
- *Reversed*: Ignored intuition, repressed inner wisdom, secrets withheld, premature speech.
- *Core tension*: The Priestess knows but does not act — her wisdom is receptive. "Action" for the Priestess is almost always to wait, to listen, to not act yet. She's strongest in "spirit", "what hides in the light", and "what to release" (releasing the need to know consciously).

**3 — The Empress**
- *Upright*: Fertility, abundance, nurturing, nature, sensuality, creativity, the earth mother, growth without forcing, beauty, the body as sacred.
- *Reversed*: Smothering, creative blocks, neglect, over-dependence, abundance withheld.
- *Core tension*: The Empress is embodied, fecund, present. "Body" for her is almost always about nourishment and pleasure. "What has grown" is a natural home. In "obstacle" positions she warns about over-nurturing (controlling through care).

**4 — The Emperor**
- *Upright*: Structure, authority, discipline, stability, fatherhood, law-giving, the skeleton that allows growth, order as care.
- *Reversed*: Rigidity, tyranny, abuse of authority, structure become cage, authoritarian control.
- *Core tension*: The Emperor's gift is structure; his shadow is rigidity. "Body" for him is discipline and regularity. "What must be released" often points at a rule being maintained past its usefulness. "First steps" is almost always: establish one clear structure.

**5 — The Hierophant**
- *Upright*: Tradition, spiritual institutions, ritual, initiation, a teacher or mentor, the bridge between sacred and everyday, shared belief systems, convention.
- *Reversed*: Dogma, blind faith, rebellious rejection of all tradition, spiritual authority abused, conformity as identity.
- *Core tension*: The Hierophant honors what has lasted — the question is always whether the tradition serves or constrains. "What to release" often points at inherited beliefs that are no longer one's own. "Seed" often points at commitment to a practice or lineage.

**6 — The Lovers**
- *Upright*: Alignment, values-based choice, union (people, ideas, aspects of self), deep connection, the moment a choice defines character.
- *Reversed*: Misalignment of values, a choice being avoided, disharmony, temptation pulling away from one's deeper knowing.
- *Core tension*: The Lovers is not only romantic — it is fundamentally about *alignment*. Every position should reflect the question: is what I'm doing aligned with my deepest values? "Obstacle" for the Lovers is often the temptation toward the easier/more pleasurable choice.

**7 — The Chariot**
- *Upright*: Victory, willpower, determination, opposing forces harnessed toward one goal, movement, triumph through discipline.
- *Reversed*: Loss of direction, forces pulling apart, aggression without direction, momentum without steering.
- *Core tension*: The Chariot is about controlled force, not brute force. The sphinxes pull in opposite directions — the mastery is harnessing them, not eliminating the tension. "Body" for the Chariot is physical drive and stamina. "Obstacle" often points at the exhaustion of constant direction-holding.

**8 — Strength**
- *Upright*: Inner strength, courage, patience with the wild/instinctual self, compassion as power, the gentle taming of the lion (not suppression — understanding).
- *Reversed*: Self-doubt, force applied where softness would work, the wild self suppressed and therefore dangerous, cowardice.
- *Core tension*: The key distinction is that Strength is NOT about brute force. It's about the open hand that tames the lion. "Body" is about working with physical drives, not against them. "What hides in the light" often points at the raw animal energy being denied.

**9 — The Hermit**
- *Upright*: Solitude, inner guidance, introspection, the lantern of inner wisdom, the wisdom that comes from withdrawal, pilgrimage, mentorship.
- *Reversed*: Isolation past usefulness, withdrawal become avoidance, the light turned inward until it burns the holder, refusal of connection.
- *Core tension*: The Hermit's withdrawal is purposeful, not permanent — he carries a light for others even while walking alone. "Action" for the Hermit is almost always to go within, to withdraw from noise. "What emerges" after the Hermit is the wisdom gained from solitude, ready to be offered.

**10 — Wheel of Fortune**
- *Upright*: Cycles, karma, turning points, fate, luck, the great rhythm to which all things move, right timing.
- *Reversed*: Resistance to change, clinging to a position on the wheel, bad luck, externalizing agency.
- *Core tension*: The Wheel is neither good nor bad — it turns. "What has grown" is whatever the cycle has brought. "What must be released" is the current position on the wheel (whatever is ending). "Obstacle" is almost always resistance to the turning.

**11 — Justice**
- *Upright*: Truth, fairness, cause and effect, accountability, the law (karmic and legal), clear-eyed assessment, the need for honesty before action.
- *Reversed*: Injustice, bias, self-deception about one's own role, judgment corrupted by agenda.
- *Core tension*: Justice demands honesty especially about oneself. "Mind" for Justice is always about clear, unbiased thinking. "What hides in the light" is often self-deception or the refusal to acknowledge one's own contribution to a situation.

**12 — The Hanged Man**
- *Upright*: Surrender, new perspective (literally upside-down), voluntary pause, the gift that comes through yielding rather than striving, sacred waiting.
- *Reversed*: Stalling masquerading as waiting, sacrifice resisted, the pause become permanent, martyrdom without wisdom.
- *Core tension*: The Hanged Man chooses to hang — it is voluntary. "Action" for the Hanged Man is the paradoxical action of non-action, of pausing deliberately. "What to release" is the striving. "Obstacle" is the discomfort of suspension.

**13 — Death**
- *Upright*: Transformation, necessary ending, transition, the clearing that creates space for new life, the levelling of what must be stripped away, rebirth through loss.
- *Reversed*: Resistance to inevitable change, clinging to what is already over, stagnation, fear of transformation.
- *Core tension*: Death in tarot is almost never literal — it is the ending of a phase, an identity, a pattern. "What must be released" is the central home of this card. "What emerges" after Death is always new growth. "Obstacle" for Death is the refusal to let go.

**14 — Temperance**
- *Upright*: Balance, moderation, alchemy, the middle path, integration of opposites, patience, the blending of what seemed incompatible.
- *Reversed*: Excess, imbalance, impatience, extremes pulling in opposite directions, the center not holding.
- *Core tension*: Temperance is about integration, not suppression of one side. "Body" for Temperance is about rhythms, moderate practice, the middle way in physical life. "How to let go" often involves a gradual, alchemical process rather than a sudden release.

**15 — The Devil**
- *Upright*: Shadow, bondage, addiction, materialism, the chains we choose, the unconscious patterns that rule us, shadow integration when faced honestly.
- *Reversed*: Breaking free, loosening the chains, shadow examined and integrated, releasing an addiction or compulsion.
- *Core tension*: The Devil's chains are LOOSE in the traditional image — the figures could step out. The bondage is chosen, habitual, unconscious. "What hides in the light" is a prime position for the Devil. "What to release" is the pattern the card names. "Obstacle" is the seduction of the familiar chain.

**16 — The Tower**
- *Upright*: Sudden upheaval, revelation that dismantles false structures, lightning bolt of truth, the collapse of what was built on a flawed foundation, liberation through chaos.
- *Reversed*: Avoided collapse that eventually arrives worse, internal tower falling (quiet dissolution), catastrophizing about manageable change.
- *Core tension*: The Tower is lightning hitting a structure that deserved to fall. "What is illuminated" is a home for this card (what the lightning revealed). "What must be released" is the false structure. "Body" for the Tower is often about shock, disruption to physical routine, the need for grounding after upheaval.

**17 — The Star**
- *Upright*: Hope, renewal, healing, inspiration after darkness, the constancy of guidance, faith, restoration, the open pour of abundance.
- *Reversed*: Hopelessness, disillusionment, passive waiting for rescue, the star obscured.
- *Core tension*: The Star comes after the Tower — it is post-crisis renewal. "Spirit" is a primary home. "What emerges" after the Star is a restored sense of possibility. "What to release" is often the protective cynicism built during the crisis.

**18 — The Moon**
- *Upright*: Illusion, the unconscious, fear, dreams, navigating the unknown, the distortion of reflected light, what is real vs. imagined, the need to keep walking.
- *Reversed*: Confusion lifting, illusions dispelling, irrational fears recognized as such, emerging from a period of obscurity.
- *Core tension*: The Moon doesn't lie — it distorts. "What hides in the light" is almost always rich with the Moon. "Spirit" for the Moon is about the dream-life and the unconscious speaking. "Obstacle" is often fear or projection.

**19 — The Sun**
- *Upright*: Joy, clarity, vitality, authentic self, success, playfulness, everything lit and visible, warmth, confidence.
- *Reversed*: Ego, arrogance, optimism blocked, vitality misdirected, the Sun's light blinding rather than illuminating.
- *Core tension*: The Sun shows everything, including what we'd prefer to hide. "What is illuminated" is obvious. "Body" for the Sun is vitality, energy, physical joy. "What hides in the light" for the Sun might be the ego inflating in the warmth.

**20 — Judgement**
- *Upright*: Awakening, reckoning, rebirth, a calling to a larger self, the trumpet that summons, honest self-evaluation leading to transformation.
- *Reversed*: Self-doubt blocking the call, avoiding necessary reckoning, old judgments mistaken for truth, refusing rebirth.
- *Core tension*: Judgement is an invitation, not a punishment. "What is illuminated" (full moon) is a home — what the reckoning has made clear. "Action" is to answer the call. "What to release" is often the old self-concept that the calling requires leaving behind.

**21 — The World**
- *Upright*: Completion, integration, wholeness, accomplishment, the end of a major cycle, dancing at the centre, all lessons learned and embodied.
- *Reversed*: Completion withheld, success not fully claimed, stagnation at the finish line, wholeness visible but not yet inhabited.
- *Core tension*: The World is rarely about external achievement — it is about internal integration. "What has grown" is an obvious home. "Spirit" for the World is a sense of cosmic belonging. "What emerges" from the World is the beginning of the next cycle — The Fool's edge again.

---

### MINOR ARCANA — WANDS (Fire / Will / Passion / Creative Energy)

*Suit theme*: Ambition, inspiration, creativity, sexuality, enterprise, the life force. The tension between spark and sustaining flame. Shadow: burnout, scattered energy, aggression.

**22 — Ace of Wands**
- New creative spark, the first fire, primal will, an opportunity requiring immediate action, pure potential.
- "Body": physical vitality, sexual energy, the life force surging. "What to release": anything dampening the spark. "First steps": literally light something — begin.

**23 — Two of Wands**
- Planning before the journey, holding the world in hand, the power of vision before departure, decision at the threshold.
- "Mind": strategic thinking, surveying possibilities. "Action": make the decision, don't just plan.

**24 — Three of Wands**
- Enterprise underway, ships sent out, foresight rewarded, expansion confirmed, patient watching for returns.
- "What has grown": what the early investment has produced. "Spirit": the confidence of one who has already begun.

**25 — Four of Wands**
- Celebration, homecoming, harvest festival, community warmth, stable structure worth celebrating, belonging.
- "Body": rest, pleasure in community. "What has grown": a community or home finally ready to celebrate.

**26 — Five of Wands**
- Competition, creative friction, scattered wills, the productive chaos before synthesis, the clash of many strong opinions.
- "Mind": competing thoughts. "Obstacle": ego competition undermining collaboration. "What to release": the need to win the argument.

**27 — Six of Wands**
- Victory, public recognition, the return from triumph, leadership acknowledged, the deserved win.
- "What is illuminated": the real achievement, now visible. "Body": the energy of winning, confident embodiment.

**28 — Seven of Wands**
- Standing ground under pressure, defending a position of value, the high ground contested, perseverance under challenge.
- "Action": hold your position; identify what's worth defending. "Body": stamina, the physical cost of endurance.

**29 — Eight of Wands**
- Rapid movement, swift communication, momentum, everything in motion at once, the arrow mid-flight.
- "Action": move quickly and without hesitation. "What has grown": the swiftness of results when momentum is real.

**30 — Nine of Wands**
- Battle-worn resilience, the last stand, guarded persistence, nearly there but carrying wounds, the alert watchfulness of the survivor.
- "Body": exhaustion that is still standing. "What must be released": the defensive crouch after the threat has passed.

**31 — Ten of Wands**
- Burden, accumulated responsibility, carrying too much too far, nearing completion with a crushing load, the need to set things down.
- "What must be released": the excess weight, the over-responsibility. "Action": identify what can be delegated or dropped.

**32 — Page of Wands**
- Enthusiastic messenger, new creative energy, the spark before it has a direction, youthful exploration, news of creative beginnings.
- "Spirit": wonder and curiosity. "First steps": anything — just start, direction matters less than movement.

**33 — Knight of Wands**
- Bold action, passionate charging forward, adventure, the willingness to burn bridges for the cause, impulsive drive.
- "Action": charge. "Obstacle": recklessness, the tendency to leap without looking.

**34 — Queen of Wands**
- Charisma, warm confidence, magnetic creative authority, self-knowledge as fire, leading by inspiring.
- "Body": radiance, physical confidence. "What is illuminated": the genuine warmth vs. the performance of it.

**35 — King of Wands**
- Visionary leadership, mature fire, entrepreneurial mastery, creative authority that sustains rather than burns.
- "Spirit": the responsibility of vision. "What has grown": a creative enterprise now at full maturity.

---

### MINOR ARCANA — CUPS (Water / Emotion / Intuition / Relationships)

*Suit theme*: Feelings, imagination, relationships, the unconscious, dreams, psychic sensitivity. Shadow: emotional overwhelm, illusion, dependency, wallowing.

**36 — Ace of Cups**
- New emotional beginning, the heart opening, love offered freely, compassion available, creative flow from feeling.
- "The gift": the open heart as offering. "Body": tears, vulnerability, the body's emotional expression.

**37 — Two of Cups**
- Mutual recognition, equal partnership, the meeting of two who see each other clearly, balanced union.
- "What is illuminated": the quality of a relationship now clearly seen. "What must be released": unequal dynamics.

**38 — Three of Cups**
- Celebration, friendship, shared joy, the feast of belonging, creative community.
- "Body": social pleasure, dancing, communal nourishment. "What has grown": a community or friendship deepened.

**39 — Four of Cups**
- Apathy, withdrawal, the unseen gift, emotional boredom, contemplation, the fourth cup offered but ignored.
- "What hides in the light": the gift that is being ignored. "Obstacle": the apathy that prevents receiving what's already offered.

**40 — Five of Cups**
- Grief, loss, the spilled cups vs. the standing cups, mourning with the awareness that something remains.
- "What must be released": the loss itself — the spilled cups. "What emerges": turning to see the two cups still standing.

**41 — Six of Cups**
- Nostalgia, the past as medicine, innocence, the gift of memory, the child-self as resource (not prison).
- "The gift": the genuine sweetness of memory. "Obstacle": when the past becomes a residence rather than a resource.

**42 — Seven of Cups**
- Illusion, wishful thinking, too many options, the proliferation of fantasy, the need for discernment between real and imagined.
- "What hides in the light": the illusion being mistaken for reality. "Obstacle": the inability to choose, all options seeming equally valid.

**43 — Eight of Cups**
- Walking away, leaving what no longer serves, the quest for something deeper, the courage to depart from what is comfortable but insufficient.
- "What must be released": the cups left behind — the situation that is complete. "How to let go": walk away quietly, without drama.

**44 — Nine of Cups**
- Wish fulfillment, contentment, satisfaction, the emotional wish granted, genuine pleasure and abundance.
- "What has grown": the wish that has come true. "What hides in the light": smugness, the risk of complacency when wishes are fulfilled.

**45 — Ten of Cups**
- Emotional completion, family/community harmony, the rainbow arc, lasting happiness, belonging that has proven true.
- "What has grown": relational wholeness. "Spirit": the deep peace of knowing you belong.

**46 — Page of Cups**
- Emotional openness, sensitive messages, creative inspiration from feeling, the fish in the cup — unexpected wisdom from depth.
- "Spirit": childlike emotional availability. "What is illuminated": an emotional truth arriving via an unexpected channel.

**47 — Knight of Cups**
- Romantic idealism, following the heart, emotional pursuit, charm, the quest for beauty and feeling.
- "The seed": a heart-led intention. "Obstacle": idealism that refuses the practical, the quest for the feeling rather than the thing itself.

**48 — Queen of Cups**
- Emotional intelligence, deep empathy, intuitive care, the cup held gently closed, wisdom from feeling.
- "How to let go": with compassion, not force. "What hides in the light": boundaries collapsed, giving from an empty cup.

**49 — King of Cups**
- Emotional mastery, calm on turbulent water, the ruler of feeling who does not suppress but does not drown, wisdom and heart together.
- "Action": respond from wisdom, not from reaction. "What is illuminated": the emotional truth previously too turbulent to see.

---

### MINOR ARCANA — SWORDS (Air / Mind / Truth / Conflict)

*Suit theme*: Thought, communication, truth, conflict, decision-making, clarity and its cost. Shadow: cruelty, anxiety, intellectualization, cutting what should be held.

**50 — Ace of Swords**
- Mental breakthrough, cutting clarity, the truth that pierces through confusion, new idea or decisive insight.
- "Mind": exceptional clarity available. "What is illuminated": what the mental blade has finally cut through to see.

**51 — Two of Swords**
- Stalemate, the deliberate blindfold, refusing to look, holding two equal possibilities in suspension.
- "What hides in the light": what the blindfold is covering. "Obstacle": the refusal to look at what is known.

**52 — Three of Swords**
- Heartbreak, grief, betrayal, painful truth, the sorrow that cuts precisely because it is real.
- "What must be released": the grief itself, felt fully. "What is illuminated": the truth the swords have made undeniable.

**53 — Four of Swords**
- Rest, recovery, the truce, the knight's lying-down, restoration of the mind through stillness.
- "Body": rest, literal physical recovery. "Action": stop. Deliberately stop.

**54 — Five of Swords**
- Hollow victory, winning at too high a cost, the ethical aftermath of conflict, gathering swords others have dropped.
- "What hides in the light": the cost of the win, the guilt about how it was achieved. "What must be released": the swords that aren't yours to carry.

**55 — Six of Swords**
- Passage away from difficulty, transition toward calmer waters, carrying the swords (the past) but moving forward.
- "What has grown": the ability to move away. "How to let go": get in the boat; the swords travel with you, but direction changes.

**56 — Seven of Swords**
- Strategy, cunning, partial disclosure, the tactical retreat, deception (self or other), operating obliquely.
- "What hides in the light": the truth being withheld or the self-deception in operation. "Obstacle": cleverness substituting for honesty.

**57 — Eight of Swords**
- Self-imposed restriction, the mental prison, the blindfolded figure surrounded by swords that form no real cage — the belief is the lock.
- "What hides in the light": the key that was always present. "What must be released": the belief that the walls are real.

**58 — Nine of Swords**
- Anxiety, dark 3am thoughts, the mind turned against itself, the dread that is not prophecy.
- "What hides in the light": what the anxiety is actually protecting against knowing. "How to let go": recognize the swords are in the mind, not the room.

**59 — Ten of Swords**
- Rock bottom, decisive end, the nadir that is also a ground, dawn on the horizon after the worst night.
- "What must be released": everything — the whole cycle is complete. "What emerges": dawn. Always dawn, after the Ten of Swords.

**60 — Page of Swords**
- Alert curiosity, quick intelligence, gathering information, the watchful mind before it has drawn conclusions.
- "Mind": pure attention without agenda. "First steps": watch and listen before speaking.

**61 — Knight of Swords**
- Decisive charge, speed of conviction, acting on truth without hesitation, the mind as weapon in motion.
- "Action": act now, decisively, without waiting for more information. "Obstacle": the charge outrunning wisdom.

**62 — Queen of Swords**
- Clear-eyed discernment, truth without softening, earned clarity after loss, the sword held upright as principle not weapon.
- "What is illuminated": what the Queen's hard-won clarity reveals. "How to let go": with directness and honesty, no false comfort.

**63 — King of Swords**
- Intellectual authority, ethical leadership, the mind as governance — precise, fair, consistent.
- "Action": make the clear, principled decision. "What has grown": the capacity for fair judgment, earned through consistent practice.

---

### MINOR ARCANA — PENTACLES (Earth / Body / Material / Time)

*Suit theme*: The physical world, work, money, health, nature, craft, long-term building. Shadow: greed, hoarding, stagnation, materialism divorced from spirit.

**64 — Ace of Pentacles**
- New material opportunity, seed of prosperity, the tangible beginning, a gift of the physical world.
- "The gift": the material opportunity itself. "Body": the body as instrument of material creation.

**65 — Two of Pentacles**
- Balancing multiple priorities, the juggler's constant adjustment, adaptability under flux, financial/practical balancing act.
- "Body": the physical cost of constant adjustment. "Obstacle": dropping a ball by trying to keep too many in the air.

**66 — Three of Pentacles**
- Skilled collaboration, craftsmanship in community, teamwork building something greater than any one person could alone.
- "The seed": a collaborative intention. "What has grown": the product of skilled teamwork.

**67 — Four of Pentacles**
- Conservation, holding tight, security vs. hoarding, the tightly held coins that may be wisdom or may be fear.
- "What hides in the light": the fear beneath the hoarding. "What must be released": the grip that has become a prison.

**68 — Five of Pentacles**
- Hardship, material scarcity, isolation in difficulty, the light in the window that is closer than it seems.
- "What is illuminated": the help that was always available. "Body": the physical experience of lack, cold, exclusion.

**69 — Six of Pentacles**
- Generosity, fair exchange, the right relationship between giving and receiving, balanced material flow.
- "Action": give what you have to give, receive what is offered. "What hides in the light": power dynamics in generosity.

**70 — Seven of Pentacles**
- Patient assessment, pausing to evaluate the garden, long-term investment and its review, the farmer's honest stocktaking.
- "What has grown": exactly what was planted — assessed honestly. "Action": look at what has actually grown before deciding next steps.

**71 — Eight of Pentacles**
- Diligence, mastery through repetition, the apprentice's dedicated practice, skill built one strike at a time.
- "Body": the body developing muscle memory. "First steps": sit down and do the work — not the plan, the actual work.

**72 — Nine of Pentacles**
- Self-sufficiency, earned abundance, the garden that is entirely one's own, luxury born of genuine competence.
- "What has grown": genuine independence and mastery. "Spirit": the quiet dignity of having built something real.

**73 — Ten of Pentacles**
- Legacy, generational wealth, the family/community root system, material and relational wholeness together.
- "What has grown": something that will outlast the builder. "What is illuminated": what the legacy actually cost and what it actually means.

**74 — Page of Pentacles**
- Practical learning, studious application, the beginner's serious attention to craft, grounding a vision in real study.
- "The seed": a practical skill to develop. "First steps": research. Study. Show up for the lesson.

**75 — Knight of Pentacles**
- Methodical progress, reliable plodding, the slow advance that outperforms the sprint, thoroughness.
- "Body": sustainable effort, the body's long-haul capacity. "How to let go": slowly, methodically — not all at once.

**76 — Queen of Pentacles**
- Practical nurturing, resourceful abundance, the ability to make a home of any environment, warmth through competence.
- "Body": the body cared for practically — fed, sheltered, tended. "How to let go": through practical action, not emotion.

**77 — King of Pentacles**
- Material mastery, responsible stewardship, abundance as responsibility, the builder who sustains what was built.
- "What has grown": an empire of practical competence. "What is illuminated": whether the abundance is being stewarded or hoarded.

---

## Summary: Common Errors to Flag

1. **Card meaning inverted without reversal flag** — a description for The Tower that says "stability" or for Death that says "stagnation resisted" without noting it's the shadow.
2. **Position-agnostic descriptions** — the same text could apply to any position (too generic).
3. **Suit energy crossed** — a Cups card described in purely intellectual terms in the "spirit" position; a Swords card described in purely emotional terms in the "mind" position.
4. **Minor-arcana descriptions that read like Major Arcana** — minor arcana describe specific, concrete situations; they shouldn't be cosmic.
5. **Full moon positions with forward-facing energy** — "what has grown" should look backward at what grew, not forward at what to plant (that's new moon energy).
6. **New moon positions with retrospective energy** — "the seed" should be an intention to plant, not a harvest.
7. **Action descriptions that aren't actionable** — "sit with the uncertainty" is marginal; "choose one thing and commit to it today" is better.
8. **Tonal drift** — descriptions that slip into generic self-help language: "embrace your power", "trust the process", "step into your authentic self". The app's voice is more precise and more literary.
