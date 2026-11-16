// Lab: casting vote (see app/routes/lab/casting*.tsx).
// What each Major Arcana stands for, and how to choose who or what plays it in a themed deck.
// Indexed by card id (0–21). Names and numerals come from app/lib/cards.ts.

export type ArcanaCasting = {
  themes: string[];
  /** What the card represents upright. */
  upright: string;
  /** What it represents reversed. */
  reversed: string;
  /** How to choose a person, character or thing for this card. */
  brief: string;
  /** One question that settles a close call. */
  ask: string;
};

export const ARCANA_CASTING: ArcanaCasting[] = [
  {
    // 0 The Fool
    themes: ["Beginnings", "Innocence", "Leap of faith", "Freedom"],
    upright:
      "The start of the journey, before experience has taught any caution. Openness, trust and the willingness to step off the edge without knowing where the ground is.",
    reversed:
      "Recklessness, or its opposite: the step never taken. Naivety that hurts other people, or a fear of looking foolish that keeps someone standing at the cliff.",
    brief:
      "Look for whoever sets out knowing the least and trusting the most. They are not stupid. They are unburdened, and the story starts because they move.",
    ask: "Who walks into the story with nothing to lose and no idea what is coming?",
  },
  {
    // 1 The Magician
    themes: ["Will", "Skill", "Manifestation", "Resourcefulness"],
    upright:
      "Turning intention into reality with the tools at hand. Focus, craft and the confidence that the world can be shaped.",
    reversed:
      "The con artist. Talent spent on tricks and manipulation, or real ability left unused because of doubt.",
    brief:
      "Look for the one who makes things happen with what is on the table. Cleverness and command of a craft matter more than raw power. They should be at least a little dangerous if they chose to deceive.",
    ask: "Who gets what they want through skill and nerve rather than strength or rank?",
  },
  {
    // 2 The High Priestess
    themes: ["Intuition", "Mystery", "Hidden knowledge", "Stillness"],
    upright:
      "What is known without being said. Inner knowing, secrets kept for good reason, and the patience to let truth surface on its own.",
    reversed:
      "Secrets that rot. Intuition ignored, information withheld to control others, or a silence that has become withdrawal.",
    brief:
      "Look for the keeper of something the others don't know. They speak rarely and are usually right. They should guard a threshold: you go through them to reach the deeper truth.",
    ask: "Who knows more than they say, and is trusted because of it?",
  },
  {
    // 3 The Empress
    themes: ["Abundance", "Nurture", "Creation", "The senses"],
    upright:
      "Life growing because it is cared for. Generosity, comfort, fertility of every kind, and pleasure taken in the physical world.",
    reversed:
      "Care that smothers, or care that has run dry. Dependence, neglect of oneself, creative block.",
    brief:
      "Look for whoever makes others flourish. Things grow around them: people, gardens, households, ideas. Warmth is the point, and authority comes from being needed rather than obeyed.",
    ask: "Around whom do other people become more alive?",
  },
  {
    // 4 The Emperor
    themes: ["Authority", "Structure", "Order", "Protection"],
    upright:
      "Order imposed so that others can live inside it. Leadership, discipline, boundaries and responsibility for what one rules.",
    reversed:
      "The tyrant, or the empty throne. Control for its own sake, rigidity, or authority that has abdicated.",
    brief:
      "Look for whoever holds the structure up. They make the rules and carry the weight of them. A good pick is respected even by people who dislike them.",
    ask: "Whose word settles the argument, and who pays for it when they are wrong?",
  },
  {
    // 5 The Hierophant
    themes: ["Tradition", "Teaching", "Belief", "Belonging"],
    upright:
      "Wisdom handed down. Institutions, mentors, ritual and the comfort of a shared way of doing things.",
    reversed:
      "Dogma, or the break from it. Rules followed past their reason, hypocrisy in the institution, or a rebel finding their own creed.",
    brief:
      "Look for the teacher who speaks for something older than themselves. Unlike the High Priestess, their knowledge is public and passed on. They initiate people into a group.",
    ask: "Who teaches the others the rules of this world?",
  },
  {
    // 6 The Lovers
    themes: ["Union", "Choice", "Values", "Harmony"],
    upright:
      "A bond freely chosen, and the choice that defines who you are. Love, alignment, and commitment made with open eyes.",
    reversed:
      "Disharmony and the choice dodged. A bond out of balance, values betrayed, or two people wanting different things.",
    brief:
      "This card usually takes a pair, though not always a romantic one. Look for the relationship that forces a choice, where being together costs something and is chosen anyway.",
    ask: "Which two cannot be told apart from the choice they made for each other?",
  },
  {
    // 7 The Chariot
    themes: ["Willpower", "Victory", "Drive", "Control"],
    upright:
      "Winning by holding opposing forces in one direction. Determination, momentum and self-discipline under pressure.",
    reversed:
      "The reins slip. Aggression without aim, a drive that has stalled, or forces pulling the person apart.",
    brief:
      "Look for the one who refuses to stop. They are defined by a goal and by the effort of steering toward it. The best pick is pulled two ways and holds both.",
    ask: "Who wins by not letting go of the reins?",
  },
  {
    // 8 Strength
    themes: ["Courage", "Patience", "Compassion", "Quiet power"],
    upright:
      "Gentleness that tames what force cannot. Courage, composure, and mastery of one's own fear and anger.",
    reversed:
      "Self-doubt, or the beast let loose. Strength that has turned to force, or courage that has given out.",
    brief:
      "Do not pick the strongest fighter. Look for whoever calms the monster instead of killing it, and whose power shows in restraint. Often there is a second figure: the lion they befriend.",
    ask: "Who could use force and chooses patience?",
  },
  {
    // 9 The Hermit
    themes: ["Solitude", "Reflection", "Guidance", "Inner light"],
    upright:
      "Withdrawing to find the truth, then holding the light for those who follow. Wisdom earned alone.",
    reversed:
      "Isolation that has become exile. Loneliness, a refusal of help, or a guide who has lost the path.",
    brief:
      "Look for whoever went away and came back knowing something. They live apart by choice, and others climb to reach them. Their help is a light to walk by, not an answer handed over.",
    ask: "Whom do the others have to seek out, and what did they give up to become that person?",
  },
  {
    // 10 Wheel of Fortune
    themes: ["Fate", "Cycles", "Turning points", "Luck"],
    upright:
      "The turn nobody controls. Luck, changing fortunes, and the reminder that every position on the wheel is temporary.",
    reversed:
      "The downturn, and the fight against it. Bad luck, resistance to change, a cycle repeated because nothing was learned.",
    brief:
      "This card rarely suits a hero. Look for the force that raises some and drops others without caring which. If you pick a person, pick one whom fortune keeps throwing around.",
    ask: "What decides who rises and who falls in this world?",
  },
  {
    // 11 Justice
    themes: ["Truth", "Fairness", "Consequence", "Accountability"],
    upright:
      "Things weighed as they are. Honesty, cause and effect, and a decision made without favour.",
    reversed:
      "The scales tipped. Unfairness, dishonesty, a debt denied, or a judge who is too harsh with themselves.",
    brief:
      "Look for whoever insists on the truth when it is inconvenient. They are fair before they are kind. A good pick has judged a friend, or themselves, by the same rule as everyone else.",
    ask: "Who makes sure that actions have consequences?",
  },
  {
    // 12 The Hanged Man
    themes: ["Surrender", "Suspension", "New perspective", "Sacrifice"],
    upright:
      "Letting go on purpose. A pause that changes how everything looks, and a sacrifice made willingly.",
    reversed: "Stuck, with nothing gained. Delay, martyrdom for show, or a sacrifice refused.",
    brief:
      "Look for whoever gives something up and sees differently because of it. They are passive by choice. The scene is one of waiting, hanging or being held, with a calm face.",
    ask: "Who stops fighting, and is changed by stopping?",
  },
  {
    // 13 Death
    themes: ["Endings", "Transformation", "Release", "Renewal"],
    upright:
      "The ending that makes the next thing possible. Something is finished, completely, and cannot be carried forward.",
    reversed:
      "The ending refused. Clinging to what is already over, stagnation, a change dragged out.",
    brief:
      "This is not the killer or the villain. Look for whoever or whatever closes a chapter for good, and leaves the world different afterwards. Someone who is themselves transformed is a strong pick.",
    ask: "After whom is nothing the same?",
  },
  {
    // 14 Temperance
    themes: ["Balance", "Moderation", "Patience", "Blending"],
    upright:
      "Mixing opposites until they hold. Calm, healing, the middle path and the slow work of getting the measure right.",
    reversed: "Excess and imbalance. Too much of one thing, impatience, parts that will not blend.",
    brief:
      "Look for the mediator, the healer, the one who belongs to two worlds and keeps them talking. They lower the temperature of every room. This pick is quiet, so the pitch matters.",
    ask: "Who holds two opposed things together without choosing a side?",
  },
  {
    // 15 The Devil
    themes: ["Attachment", "Temptation", "Shadow", "Bondage"],
    upright:
      "The chains worn by choice. Addiction, obsession, material hunger, and the parts of oneself nobody wants to look at.",
    reversed:
      "The chains seen for what they are. Breaking free, facing the shadow, or a relapse into old habits.",
    brief:
      "Look for the thing people cannot give up, or the one who offers it. The best Devil is tempting, not just evil: the audience should understand why someone would say yes.",
    ask: "What does everyone want here, even though it owns them?",
  },
  {
    // 16 The Tower
    themes: ["Upheaval", "Revelation", "Collapse", "Awakening"],
    upright:
      "A false structure struck down in a moment. Sudden change, a truth nobody can ignore any longer, and the freedom of the rubble.",
    reversed:
      "The collapse delayed or dreaded. A disaster narrowly avoided, or a slow fall that someone refuses to admit.",
    brief:
      "Think of an event before a person. Look for the moment the story breaks in two. If you pick a person, pick the one who brings the lightning, or the one who built the tower too high.",
    ask: "What is the moment when everything that seemed solid came down?",
  },
  {
    // 17 The Star
    themes: ["Hope", "Healing", "Faith", "Serenity"],
    upright:
      "Calm after the disaster. Hope without proof, generosity, and the quiet trust that things can be made whole.",
    reversed: "Hope dimmed. Despair, disconnection, faith lost in oneself or in the future.",
    brief:
      "Look for whoever others look to when all is lost. They give freely and ask for nothing. This pick shines brightest right after the Tower, so think of who appears in the ruins.",
    ask: "Who makes the others believe it will be all right?",
  },
  {
    // 18 The Moon
    themes: ["Illusion", "Fear", "Dreams", "The unconscious"],
    upright:
      "The path by night, where nothing is quite what it looks like. Uncertainty, instinct, dreams and old fears stirring.",
    reversed:
      "The fog lifting, or thickening. Confusion released and secrets surfacing, or self-deception taking hold.",
    brief:
      "Look for whoever cannot be read: the shapeshifter, the dreamer, the one whose loyalties stay unclear. It also suits a place where the characters lose their bearings.",
    ask: "Who, or where, makes the others doubt what they see?",
  },
  {
    // 19 The Sun
    themes: ["Joy", "Vitality", "Clarity", "Success"],
    upright:
      "Everything seen in full daylight. Warmth, confidence, plain happiness and success that is shared.",
    reversed:
      "The light behind cloud. Joy delayed, forced cheerfulness, or confidence turned to vanity.",
    brief:
      "Look for the simplest, warmest presence in the cast. Nothing is hidden with them. Children and childlike characters fit well, as does the moment of uncomplicated victory.",
    ask: "Who is exactly what they appear to be, and is loved for it?",
  },
  {
    // 20 Judgement
    themes: ["Reckoning", "Calling", "Rebirth", "Absolution"],
    upright:
      "The call that wakes the dead. Answering for the past, being forgiven, and rising into a larger purpose.",
    reversed:
      "The call ignored. Self-doubt, harsh self-judgement, or a past that someone will not face.",
    brief:
      "Look for whoever is given a second life and answers for the first. Redemption arcs live here. Justice weighs an act, while Judgement sums up a whole life and then lets it begin again.",
    ask: "Who is called to account, and comes back changed?",
  },
  {
    // 21 The World
    themes: ["Completion", "Wholeness", "Integration", "Arrival"],
    upright:
      "The journey finished and everything in its place. Fulfilment, belonging, and a cycle closed well.",
    reversed: "Almost. A loose end, a shortcut taken, an ending that will not quite close.",
    brief:
      "Look for whoever or whatever stands for the whole of it: where the Fool finally arrives. It often suits the setting itself, or the ensemble together, better than any single character.",
    ask: "What does the story look like when it is complete?",
  },
];
