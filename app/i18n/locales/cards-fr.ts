// French card data inspired by the Tarot de Marseille tradition.
// Names follow the canonical Tarot de Marseille nomenclature.
// Descriptions draw from French esoteric sources (Papus, Wirth, Jodorowsky) —
// not literal translations of the English text.

export interface FrCardData {
  name: string;
  descriptions: [string, string, string, string, string];
  reversedDescriptions: [string, string, string, string, string];
}

export const FR_CARDS: Record<number, FrCardData> = {
  // ─── Arcanes Majeurs ────────────────────────────────────────────────────────

  0: {
    name: "Le Mat",
    descriptions: [
      "Un nouveau chemin s'ouvre. Avancez sans vous encombrer du passé.",
      "Au bord du gouffre, l'innocence tient lieu de sagesse. La chute est aussi un envol.",
      "Vous vous tenez au seuil entre deux mondes. Le vide devant vous n'est pas un danger — c'est l'espace où tout devient possible.",
      "Le chaos est votre boussole. Ce que le monde nomme folie, l'arcane nomme liberté première.",
      "Avant toute forme, avant tout nom, il y avait le Mat — l'élan pur du commencement, le cosmos s'éveillant à lui-même.",
    ],
    reversedDescriptions: [
      "L'hésitation vous immobilise. Le premier pas se dérobe.",
      "Le précipice est là, mais les pieds refusent de quitter la terre ferme. Ce qui est connu pèse plus que ce qui pourrait être.",
      "L'élan existe, mais le moment n'est pas juste. La terre sous vos pieds ne s'est pas encore solidifiée.",
      "Un ancien moi s'accroche au rebord tandis que le nouveau attend dans le vent. La mue est douloureuse.",
      "L'impulsion primordiale inversée : la création hésite à son propre seuil, et l'univers ne commence pas.",
    ],
  },

  1: {
    name: "Le Bateleur",
    descriptions: [
      "Les outils sont là. Concentrez votre volonté et passez à l'acte.",
      "L'intention devient geste. Vous possédez plus de pouvoir que vous ne le croyez.",
      "Les quatre règnes répondent à votre appel. Ce que vous envisagez peut prendre forme — le canal entre la pensée et le monde est ouvert.",
      "Vous êtes le point de passage entre le ciel et la terre, entre l'idée et la matière. L'univers ne crée pas pour vous ; il crée à travers vous.",
      "Premier acte de la volonté après le vide. Toute création est ce geste : comme en haut, ainsi en bas.",
    ],
    reversedDescriptions: [
      "L'énergie dispersée ne produit rien. Rassemblez-vous.",
      "Les talents existent mais demeurent enfouis, dissimulés sous le doute ou la distraction.",
      "Le canal est ouvert, mais il se détourne — la puissance s'écoule dans l'illusion ou la manipulation.",
      "Le bateleur qui se trompe lui-même : tous les outils sont là, et pourtant il ne conjure qu'un spectacle vide pour un moi qui a oublié ce qu'il désire vraiment.",
      "Le potentiel infini du vide s'effondre en stagnation quand la volonté est absente.",
    ],
  },

  2: {
    name: "La Papesse",
    descriptions: [
      "Faites confiance à votre intuition. Quelque chose d'essentiel se cache juste sous la surface.",
      "L'eau calme révèle ce que l'agitation dissimule. Écoutez avant de parler.",
      "Le voile entre les mondes est mince pour vous en ce moment. Ce que vous sentez sans pouvoir l'expliquer est plus vrai que ce que vous pouvez démontrer.",
      "Une connaissance ancienne vous traverse, contournant la logique. L'attraction de la lune sur les marées n'est pas intellectuelle — celle-ci non plus.",
      "Avant la Parole, il y avait le Silence. Vous portez en vous la mémoire de ce silence originel.",
    ],
    reversedDescriptions: [
      "L'intuition est étouffée par le bruit du monde. Cherchez le calme.",
      "La sagesse intérieure existe, mais la pression extérieure ou le doute la tait.",
      "Un savoir caché est retenu — qu'on vous le cache, ou que vous le cachiez vous-même.",
      "Le voile si serré entre la conscience et les profondeurs que ce qui devrait guider devient ce qui hante — présent dans les rêves, nié au réveil.",
      "Le silence primordial brisé avant l'heure : la sagesse exprimée trop tôt devient confusion.",
    ],
  },

  3: {
    name: "L'Impératrice",
    descriptions: [
      "Nourrissez ce qui pousse. Quelque chose dans votre vie réclame votre attention bienveillante.",
      "L'abondance vient de la patience. La création ne se force pas — elle se déploie.",
      "La terre fertile de votre existence est riche en ce moment. Ce que vous semez avec soin reviendra multiplié.",
      "Vous portez en vous la force générative de la nature elle-même. La croissance, la beauté et l'abondance ne sont pas des récompenses — elles sont votre nature profonde.",
      "Elle est la terre qui se souvient qu'elle est vivante — toute croissance, toute nourriture, toute la chaleur qui rend la vie possible.",
    ],
    reversedDescriptions: [
      "La négligence freine la croissance. Prenez soin de ce qui s'étiole.",
      "Des blocages créatifs ou des dépendances interrompent l'abondance naturelle.",
      "La générosité est tournée vers l'intérieur, étouffant ce qui cherche à émerger.",
      "La mère qui dévore au lieu de nourrir : la puissance créatrice retournée contre sa propre source.",
      "La terre, oubliant sa nature vivante, se referme. L'hiver du monde ne cède pas.",
    ],
  },

  4: {
    name: "L'Empereur",
    descriptions: [
      "Structurez. Une situation réclame de l'ordre et de la clarté.",
      "L'autorité vient de la maîtrise de soi, non de la domination sur autrui.",
      "Vous êtes appelé à bâtir quelque chose de durable. La discipline n'est pas une contrainte — c'est la forme que prend la liberté.",
      "Le pouvoir réel ne s'exerce pas par la force mais par la présence. Là où vous vous tenez, les choses prennent forme.",
      "Avant le monde, la Loi. L'Empereur est le principe d'ordre qui permet à la création de persister sans retourner au chaos.",
    ],
    reversedDescriptions: [
      "La rigidité bloque ce qui cherche à changer. Lâchez le contrôle.",
      "L'autorité est exercée sans sagesse, ou bien le pouvoir vous échappe là où il devrait être affirmé.",
      "La structure est devenue prison. Les règles que vous avez établies vous emprisonnent maintenant.",
      "Le tyran en vous exige une obéissance que rien ne justifie — de vous-même ou des autres.",
      "L'ordre primordial s'effondre : sans forme, le monde retourne à l'indifférencié.",
    ],
  },

  5: {
    name: "Le Pape",
    descriptions: [
      "Cherchez conseil auprès d'une sagesse éprouvée. Une tradition peut vous guider.",
      "La transmission d'un savoir est en jeu — que vous l'enseigniez ou que vous le receviez.",
      "Vous êtes invité à vous relier à quelque chose de plus grand que vous. La foi n'est pas aveugle — elle est la confiance accordée à ce que l'expérience a confirmé.",
      "Le pont entre le visible et l'invisible. Ce qui vous est transmis vient d'une lignée plus ancienne que vous ne le supposez.",
      "Avant les temples, il y avait la grotte. L'arcane du Pape est la mémoire que le sacré précède toute institution.",
    ],
    reversedDescriptions: [
      "Un dogme vous empêche de voir. Questionnez ce que vous avez accepté sans examen.",
      "L'autorité spirituelle est mal exercée — ou vous résistez à un enseignement dont vous avez besoin.",
      "La forme rituelle s'est vidée de son sens. L'enveloppe reste, mais l'esprit s'en est allé.",
      "L'enseignant qui corrompt la transmission : la connaissance utilisée pour contrôler plutôt que pour libérer.",
      "La coupure entre le visible et l'invisible : le pont s'est effondré, et les deux rives ne communiquent plus.",
    ],
  },

  6: {
    name: "Les Amoureux",
    descriptions: [
      "Un choix se présente. Soyez honnête avec vous-même sur ce que vous désirez vraiment.",
      "Deux chemins s'ouvrent. La décision que vous prenez reflétera qui vous choisissez d'être.",
      "L'amour est ici une force de révélation autant que d'union. Ce que vous aimez vous dit qui vous êtes.",
      "Le vrai choix n'est jamais entre deux personnes ou deux voies — il est entre deux versions de vous-même.",
      "À l'origine de toute dualité se tient cet arcane : la conscience qui se reconnaît dans l'autre, et dans cette reconnaissance, se complète.",
    ],
    reversedDescriptions: [
      "Une décision est évitée. L'ambivalence a un coût.",
      "Les désirs et les valeurs sont en conflit. Ce que vous voulez et ce que vous croyez vouloir ne coïncident pas.",
      "Une union — à l'autre ou à vous-même — est compromise par la peur ou la dépendance.",
      "Le choix fait par défaut plutôt que par discernement. Vous habitez une vie que vous n'avez pas vraiment choisie.",
      "La dualité originelle qui refuse la synthèse : deux pôles qui se repoussent, et l'amour comme force unificatrice qui s'absente.",
    ],
  },

  7: {
    name: "Le Chariot",
    descriptions: [
      "Avancez avec détermination. La victoire est à portée si vous maintenez le cap.",
      "La volonté et le corps s'unissent pour vous porter en avant. Le mouvement lui-même est la réponse.",
      "Vous avez réussi à maîtriser des forces opposées. Ce n'est pas la suppression du conflit, mais son dépassement par la direction.",
      "La vraie maîtrise n'est pas l'absence de tension — c'est de diriger des forces contradictoires vers un même but.",
      "Le Chariot est l'élan de la vie lui-même : l'impulsion qui traverse l'espace entre ce qui est et ce qui sera.",
    ],
    reversedDescriptions: [
      "L'élan se brise. Des forces contraires vous freinent ou vous dévient.",
      "La victoire est compromise par l'arrogance ou par une direction mal assurée.",
      "Les forces que vous tentez de maîtriser vous dépassent. Le contrôle est une illusion pour l'instant.",
      "Le conducteur qui lutte contre ses propres chevaux : les désirs en conflit paralysent l'avancée.",
      "L'élan primordial inversé : l'impulsion de vie se retourne sur elle-même, et le mouvement devient chaos.",
    ],
  },

  8: {
    name: "La Justice",
    descriptions: [
      "Regardez les faits en face. Une situation demande honnêteté et équilibre.",
      "Ce qui est juste n'est pas toujours confortable. La vérité a plus de valeur que le confort.",
      "Un ajustement s'opère — dans votre vie ou en vous-même. La balance ne ment pas.",
      "La Justice ne punit pas : elle rétablit l'équilibre que vos actes ont rompu. Ce que vous récoltez est la conséquence exacte de ce que vous avez semé.",
      "Avant les tribunaux, il y avait la Loi cosmique : la cause et l'effet tissés dans la trame du réel.",
    ],
    reversedDescriptions: [
      "L'injustice règne temporairement, ou votre jugement est biaisé.",
      "Vous évitez de voir quelque chose que la balance rendrait visible.",
      "L'équilibre est perturbé par le déni ou la partial — en vous ou autour de vous.",
      "La Justice aveuglée par l'intérêt : la balance truquée, et la conscience qui consent à ne pas voir.",
      "Le déséquilibre primordial : la cause et l'effet dissociés, et le tissu du réel qui se défait.",
    ],
  },

  9: {
    name: "L'Ermite",
    descriptions: [
      "Retirez-vous du bruit un moment. La réponse que vous cherchez est en vous.",
      "La lanterne éclaire un seul pas à la fois. C'est suffisant.",
      "Vous êtes invité à descendre en vous-même. La solitude n'est pas l'abandon — c'est la condition de la vraie rencontre.",
      "Celui qui porte sa propre lumière ne dépend d'aucune autre. L'Ermite a traversé l'obscurité et en est revenu, porteur d'un savoir que l'on ne peut qu'acquérir seul.",
      "À l'origine de toute quête se trouve ce retrait : l'âme qui s'éloigne du monde pour se retrouver elle-même.",
    ],
    reversedDescriptions: [
      "L'isolement devient enfermement. Le retrait en soi s'est transformé en fuite.",
      "La sagesse est là, mais vous refusez de vous y confronter — ou vous vous êtes coupé des autres sans raison.",
      "La lanterne s'est éteinte. Vous cherchez dans le noir une clarté que vous possédez mais n'acceptez pas.",
      "L'ermite qui ne revient pas : la quête intérieure tournée en retrait permanent du monde vivant.",
      "La lumière primordiale retirée à elle-même : la conscience qui s'absente, et le chemin plongé dans l'obscurité.",
    ],
  },

  10: {
    name: "La Roue de Fortune",
    descriptions: [
      "Un cycle se referme, un autre commence. Accueillez le changement.",
      "La roue tourne sans s'arrêter. Ce qui monte finira par descendre, et inversement.",
      "Vous êtes au cœur d'un changement de cycle. Ni résistance ni passivité — soyez attentif à ce qui émerge.",
      "La Fortune n'est pas aveugle : elle répond à quelque chose de plus profond que le hasard. Vos propres rythmes s'accordent ou se désaccordent avec ceux du monde.",
      "La Roue est le temps lui-même — l'éternel retour, le souffle de l'univers qui aspire et expire.",
    ],
    reversedDescriptions: [
      "Vous résistez à un changement inévitable. La roue tourne malgré tout.",
      "Un cycle de malchance persiste parce que quelque chose n'a pas été intégré.",
      "Vous vous accrochez à une phase qui s'est déjà terminée. Le passé ne peut pas être retenu.",
      "La roue tournée contre vous : des patterns répétitifs que vous n'avez pas encore reconnus comme des leçons.",
      "La roue arrêtée — non par la maîtrise, mais par l'immobilité du destin qui attend que quelque chose se dénoue.",
    ],
  },

  11: {
    name: "La Force",
    descriptions: [
      "Avancez avec douceur et fermeté. La vraie force ne s'impose pas.",
      "Ce qui rugit en vous n'a pas besoin d'être écrasé — il a besoin d'être apprivoisé.",
      "La Force de cet arcane n'est pas la domination — c'est la capacité à rester ouvert face à ce qui effraie.",
      "Vous êtes capable de traverser ce qui vous terrorise sans vous y durcir. C'est la vertu la plus rare.",
      "Avant la domestication du feu, il y avait la relation avec la bête. La Force primordiale est la réconciliation avec notre propre nature sauvage.",
    ],
    reversedDescriptions: [
      "Vous forcez là où la douceur est requise, ou vous cédez là où la fermeté s'impose.",
      "La peur du lion intérieur vous empêche d'avancer. Ce que vous fuyez grandit.",
      "La force mal dirigée devient brutalité — envers vous-même ou envers les autres.",
      "La bête non apprivoisée : les instincts qui gouvernent sans direction, ou l'énergie vitale comprimée jusqu'à l'explosion.",
      "La Force primordiale inversée : la nature sauvage en guerre avec elle-même, et la paix impossible.",
    ],
  },

  12: {
    name: "Le Pendu",
    descriptions: [
      "Faites une pause. Ce que vous vivez comme un blocage est peut-être une invitation à voir autrement.",
      "Le monde vu depuis le bas, depuis l'envers, révèle ce que la position ordinaire dissimule.",
      "L'attente active n'est pas la passivité. Dans cette suspension, quelque chose se prépare qui nécessite votre lâcher-prise.",
      "Le Pendu a choisi sa position. Ce sacrifice apparent est le seul chemin vers ce qu'il cherche.",
      "La grande inversion : le retournement que l'âme doit opérer pour voir avec les yeux de l'esprit plutôt qu'avec ceux du monde.",
    ],
    reversedDescriptions: [
      "Vous vous accrochez là où il faudrait lâcher, ou vous lâchez là où il faudrait tenir.",
      "Le sacrifice est évité, et avec lui, la transformation qu'il aurait rendu possible.",
      "La suspension devient paralysie. Ce qui devait être une pause est devenu une habitude.",
      "Le sacrifice consenti par autrui mais refusé pour soi-même : une exigence envers les autres qu'on ne s'applique pas.",
      "L'inversion primordiale refusée : l'âme qui s'accroche à sa position habituelle, et la vision profonde qui reste inaccessible.",
    ],
  },

  13: {
    name: "L'Arcane sans Nom",
    descriptions: [
      "Une fin libère de la place pour ce qui vient. Faites confiance au processus.",
      "Ce qui se termine ne disparaît pas — il se transforme. La faucille ne détruit pas, elle moissonne.",
      "La mort que représente cet arcane n'est pas la fin — c'est la métamorphose la plus complète. Ce qui ne peut plus vivre doit laisser la place.",
      "La Grande Faucheuse n'est pas votre ennemie. Elle est l'alliée de tout ce qui cherche à se renouveler.",
      "Avant toute naissance, il y a la mort de ce qui précède. L'Arcane sans Nom est le silence entre deux battements du cœur cosmique.",
    ],
    reversedDescriptions: [
      "Résistance à une fin nécessaire. Ce qui doit se terminer est maintenu en vie artificiellement.",
      "La peur de la perte empêche la transformation. Vous vous accrochez à ce qui vous alourdit.",
      "Stagnation. Le refus de laisser partir ce qui est mort maintient l'existence dans un entre-deux inconfortable.",
      "La mort refusée devient hantise. Ce qui aurait dû passer vous emprisonne.",
      "La grande transformation bloquée : le cosmos retient son souffle, et le renouveau est en suspens.",
    ],
  },

  14: {
    name: "La Tempérance",
    descriptions: [
      "Trouvez l'équilibre entre les contraires. Ni trop, ni trop peu.",
      "Le juste dosage est un art. Ce qui vous est demandé en ce moment, c'est la mesure.",
      "Quelque chose se mélange, se combine, s'ajuste en vous. Laissez l'alchimie opérer sans intervenir.",
      "La Tempérance est le passage entre deux états : l'Ange transvase les eaux de la conscience pour que leur mélange produise quelque chose de nouveau.",
      "Avant la séparation des éléments, il y avait l'unité. La Tempérance primordiale est le souvenir de cette unité originelle.",
    ],
    reversedDescriptions: [
      "L'excès ou la privation perturbent ce qui cherche l'équilibre.",
      "Un mélange mal dosé produit un résultat instable. Revoyez les proportions.",
      "Le processus alchimique est interrompu. Quelque chose de nouveau ne peut pas encore émerger.",
      "L'impatience brise l'opération en cours. Vous intervenez là où il faudrait laisser faire.",
      "Le déséquilibre primordial : les éléments refusent de se mêler, et la création reste en fragments.",
    ],
  },

  15: {
    name: "Le Diable",
    descriptions: [
      "Examinez ce qui vous enchaîne. Les chaînes sont souvent moins solides qu'elles n'y paraissent.",
      "Une forme de dépendance ou d'illusion est à l'œuvre. Regardez-la en face.",
      "Ce que vous prenez pour une contrainte extérieure est peut-être une création intérieure. Le Diable montre ce à quoi vous avez consenti de vous lier.",
      "L'ombre que vous refusez d'intégrer prend du pouvoir sur vous. La confronter, c'est commencer à la dissoudre.",
      "L'Adversaire primordial est le nom que la conscience donne à ses propres limitations quand elle refuse de les reconnaître comme siennes.",
    ],
    reversedDescriptions: [
      "Une chaîne est brisée, ou la prise de conscience d'une emprise est proche.",
      "Ce qui vous tenait prisonnier commence à lâcher, à condition que vous cessiez de lui donner votre consentement.",
      "Libération en cours, mais les habitudes de la captivité persistent. La cage est ouverte — osez sortir.",
      "La fascination pour sa propre ombre. Vous vous libérez mais revenez à ce qui vous lie.",
      "La libération primordiale : le refus de la conscience de reconnaître ses propres limites se dissout.",
    ],
  },

  16: {
    name: "La Maison-Dieu",
    descriptions: [
      "Une structure qui ne servait plus s'effondre pour faire place au neuf.",
      "La destruction soudaine est parfois la seule façon dont la vérité peut entrer.",
      "Ce qui s'écroule en ce moment était construit sur du sable. L'effondrement est douloureux, mais la révélation qui l'accompagne est réelle.",
      "La foudre qui frappe la Maison-Dieu ne détruit pas — elle révèle. Ce qui était caché dans les murs apparaît enfin.",
      "Avant la construction du monde, il a fallu dissoudre le chaos primordial. La Maison-Dieu est cette dissolution nécessaire.",
    ],
    reversedDescriptions: [
      "Un effondrement est évité, mais les fondations fragiles demeurent.",
      "La destruction est retardée, non évitée. Les fissures continuent de s'agrandir.",
      "Vous reconstruisez prématurément sur les mêmes fondations. La leçon n'a pas encore été intégrée.",
      "La peur de l'effondrement vous empêche d'examiner ce qui est déjà fissuré. Mieux vaut regarder maintenant.",
      "L'effondrement refusé : les structures qui auraient dû tomber persistent, empêchant ce qui doit naître d'émerger.",
    ],
  },

  17: {
    name: "L'Étoile",
    descriptions: [
      "L'espoir est fondé. Une direction se précise dans le ciel de votre vie.",
      "Après la tempête, l'étoile guide. Ce que vous cherchez n'est pas hors de portée.",
      "Une guérison profonde est à l'œuvre. L'Étoile verse ses eaux sur la terre et dans la rivière — ce qui a été épuisé se recharge.",
      "Vous êtes vu. Quelque chose de plus grand que vous oriente votre chemin. Faites confiance à ce qui brille dans votre ciel intérieur.",
      "L'Étoile primordiale est la lumière que l'univers a placée dans chaque âme pour qu'elle puisse retrouver son chemin.",
    ],
    reversedDescriptions: [
      "L'espoir est voilé. Une direction attendue se dérobe.",
      "Le doute éteint la lumière que vous portez. Ce n'est pas l'étoile qui s'est éteinte — c'est votre regard.",
      "La guérison est en cours, mais quelque chose l'entrave. Examinez ce que vous retenez encore.",
      "L'étoile que vous suivez est peut-être la mauvaise — ou vous la suivez pour fuir plutôt que pour trouver.",
      "La lumière primordiale obscurcie : la promesse de l'origine, enfouie sous trop de nuits sans regard.",
    ],
  },

  18: {
    name: "La Lune",
    descriptions: [
      "Quelque chose n'est pas ce qu'il paraît. Méfiez-vous des illusions du moment.",
      "Les profondeurs remuent. Ce qui remonte à la surface mérite attention, même si c'est inconfortable.",
      "Vous traversez un espace de confusion nécessaire. La Lune éclaire juste assez pour avancer, pas assez pour tout voir.",
      "Le monde que vous habitez en ce moment est celui du rêve et de l'inconscient. Ce qui vous trouble vient d'une profondeur que la raison ne peut pas atteindre seule.",
      "La Lune primordiale est le miroir des eaux intérieures : reflet imparfait, mais seul visible quand le soleil s'est couché.",
    ],
    reversedDescriptions: [
      "Une illusion se dissipe, ou la confusion commence à se clarifier.",
      "Ce qui était caché ou nié remonte avec force. Mieux vaut l'accueillir que le fuir.",
      "Les peurs nocturnes prennent trop de place. Cherchez ce qui est réel derrière ce qui semble menaçant.",
      "La Lune tournée contre elle-même : l'imagination à son service, créant des monstres là où il n'y en a pas.",
      "La dissolution primordiale : les frontières entre soi et le monde disparaissent, et l'identité se perd dans les eaux.",
    ],
  },

  19: {
    name: "Le Soleil",
    descriptions: [
      "Clarté et énergie. Ce qui était incertain devient clair.",
      "La lumière du Soleil ne cache rien. Ce qui est, est — et c'est suffisant.",
      "Joie, vitalité, conscience. Vous émergez d'une période d'obscurité avec plus que ce que vous y aviez apporté.",
      "Le Soleil n'éclaire pas seulement votre chemin — il révèle votre propre lumière. Vous n'empruntez plus la clarté : vous la rayonnez.",
      "Le Soleil primordial : la conscience qui se reconnaît enfin, et dans cette reconnaissance, illumine tout ce qui l'entoure.",
    ],
    reversedDescriptions: [
      "La clarté est voilée. Un excès d'ombre, ou paradoxalement d'éclat aveuglant.",
      "La confiance en soi est fragilisée, ou vous cherchez à briller d'un éclat qui n'est pas le vôtre.",
      "Le Soleil trop ardent dessèche autant qu'il nourrit. Quelque chose a besoin d'ombre pour croître.",
      "L'égo qui se prend pour le Soleil : brillant mais aveuglant, incapable de reconnaître la lumière des autres.",
      "La conscience primordiale voilée : l'illumination qui s'était levée s'efface, et le monde retombe dans l'attente.",
    ],
  },

  20: {
    name: "Le Jugement",
    descriptions: [
      "Un appel vous parvient. Répondez-y avec honnêteté.",
      "Quelque chose en vous se lève après une longue attente. Écoutez ce qui cherche à naître.",
      "Vous êtes appelé à vous juger vous-même avec équité. Ni complaisance ni sévérité — juste la vérité.",
      "La trompette sonne pour vous en ce moment. Ce réveil n'est pas une fin — c'est l'appel vers une vie plus pleinement vécue.",
      "Le Jugement primordial : le cosmos qui se reconnaît dans chacun de ses fragments, et rappelle chaque âme à sa nature originelle.",
    ],
    reversedDescriptions: [
      "L'appel est ignoré ou n'est pas encore entendu.",
      "Un réveil différé. Ce qui cherche à naître en vous est repoussé par la peur ou la routine.",
      "Un jugement trop sévère — envers vous-même ou envers autrui — fausse la vision.",
      "La sourde oreille face à l'appel du renouveau. La trompette résonne, et vous restez dans le tombeau.",
      "L'éveil primordial refusé : l'âme qui s'accroche à sa forme ancienne quand la vie la rappelle à se transformer.",
    ],
  },

  21: {
    name: "Le Monde",
    descriptions: [
      "Un cycle s'achève avec succès. Quelque chose est accompli.",
      "Vous avez parcouru un long chemin. Ce qui est arrivé à terme mérite d'être reconnu.",
      "Complétude. Vous êtes à un moment d'intégration — tout ce qui a été traversé trouve maintenant sa cohérence.",
      "Le Monde n'est pas une destination, mais un état d'accord avec ce qui est. Vous habitez pleinement le présent de votre existence.",
      "La danse primordiale du Monde : la conscience qui s'est reconnue dans chaque fragment de son expérience et se tient maintenant, entière, au centre de tout.",
    ],
    reversedDescriptions: [
      "Un accomplissement tarde ou est incomplet. La ligne d'arrivée est visible mais pas encore franchie.",
      "Quelque chose freine la complétude. Examinez ce qui résiste à la conclusion.",
      "Vous cherchez à clore quelque chose qui réclame encore un passage. Ou inversement : vous gardez ouvert ce qui doit être refermé.",
      "La peur de la complétude — car finir, c'est devoir recommencer. Le Monde renversé fuit sa propre danse.",
      "L'accomplissement primordial différé : la conscience qui a tout traversé mais refuse de se reconnaître dans sa propre plénitude.",
    ],
  },

  // ─── Bâtons (Wands) ─────────────────────────────────────────────────────────

  22: {
    name: "As de Bâton",
    descriptions: [
      "Une nouvelle énergie créatrice émerge. Saisissez-la.",
      "L'étincelle est là. Ce feu demande à être alimenté, non contenu.",
      "Un commencement brûlant. Ce qui s'amorce porte en lui toute la puissance du feu — inspiration, volonté, passion.",
      "L'As de Bâton est le feu avant même la flamme : pure potentialité, prête à consumer le monde si vous lui donnez l'air.",
      "Le feu sacré primordial — le premier désir de l'univers de se manifester sous forme d'action.",
    ],
    reversedDescriptions: [
      "L'élan créateur est bloqué ou mal orienté. Cherchez ce qui éteint la flamme.",
      "L'enthousiasme existe, mais quelque chose l'empêche de se déployer.",
      "Trop de feu sans direction brûle ce qu'il aurait dû nourrir. Canalisez l'énergie.",
      "La création qui se consume elle-même. Le désir sans objet devient destruction.",
      "Le feu primordial inversé : la puissance créatrice retournée sur sa source.",
    ],
  },

  23: {
    name: "Deux de Bâtons",
    descriptions: [
      "Vous avez posé les bases. Regardez maintenant ce qui s'ouvre devant vous.",
      "Entre deux chemins, une vision prend forme. La décision n'est pas encore prise, mais la direction s'esquisse.",
      "Vous avez acquis quelque chose, et vous mesurez ce que cela vous permet d'atteindre. L'horizon s'élargit.",
      "La maîtrise partielle acquise, la vraie question se pose : qu'en ferez-vous ? Le monde est vaste.",
      "Le deux du feu : la volonté qui se double d'une vision, et se reconnaît comme force capable de transformer le monde.",
    ],
    reversedDescriptions: [
      "L'hésitation face au choix. L'horizon est là, mais le mouvement manque.",
      "Un plan mal élaboré ou une vision trop étroite limite les possibilités.",
      "La peur du grand espace. Vous vous repliez là où l'expansion est possible.",
      "La vision qui se retourne en obsession — regarder au loin au point d'oublier où vous vous trouvez.",
      "Le feu de la vision s'éteint dans la prudence excessive.",
    ],
  },

  24: {
    name: "Trois de Bâtons",
    descriptions: [
      "Ce que vous avez lancé prend son propre élan. Observez, ajustez si nécessaire.",
      "Vous attendez le retour de ce que vous avez envoyé dans le monde. Les résultats approchent.",
      "La vision initiale s'est transformée en action, et l'action porte ses premiers fruits. Quelque chose revient vers vous.",
      "Vous êtes sur la crête : derrière, l'origine ; devant, l'expansion. Votre projet a dépassé vos mains.",
      "Le trois du feu : l'élan créateur qui prend son autonomie et commence à exister pour lui-même.",
    ],
    reversedDescriptions: [
      "Les résultats tardent, ou un retard contrecarre vos plans.",
      "Ce que vous avez lancé revient sous une forme inattendue. Adaptez-vous.",
      "Vous regardez trop loin alors que ce qui vous est nécessaire est près. L'attente mal orientée.",
      "L'expansion bloquée par un obstacle non vu. Cherchez ce qui freine le mouvement.",
      "L'élan créateur qui retombe avant d'avoir atteint son but.",
    ],
  },

  25: {
    name: "Quatre de Bâtons",
    descriptions: [
      "Un moment de joie et de célébration. Savourez ce qui a été accompli.",
      "Un seuil est franchi. Ce qui a été bâti offre maintenant un espace de repos mérité.",
      "La structure créée par votre effort devient un lieu de refuge et de fête. L'effort porte du fruit visible.",
      "La communauté, le foyer, la récolte — le feu de la création qui devient chaleur partagée.",
      "Le quatre du feu : la flamme qui s'est stabilisée en foyer, en lieu de rassemblement.",
    ],
    reversedDescriptions: [
      "La célébration est incomplète ou prématurée. Quelque chose manque encore.",
      "Le foyer est instable. Ce qui devrait être un lieu de repos est source de tension.",
      "Vous cherchez la joie dans un endroit qui ne peut pas vous la donner.",
      "L'attachement excessif à ce qui a été construit empêche la prochaine étape.",
      "Le foyer renversé : le feu qui devait réchauffer s'est éteint ou dévore ce qu'il devait protéger.",
    ],
  },

  26: {
    name: "Cinq de Bâtons",
    descriptions: [
      "Un conflit ou une compétition est en cours. Tenez bon sans perdre de vue l'essentiel.",
      "Le désaccord actuel n'est pas nécessairement destructeur — il peut clarifier ce qui compte vraiment.",
      "L'énergie conflictuelle peut être canalisée. Ce qui se confronte ici cherche peut-être à se définir.",
      "Les bâtons croisés ne se détruisent pas — ils testent la solidité de chacun. Ce qui résiste prouve sa valeur.",
      "Le cinq du feu : les forces créatrices qui s'affrontent pour établir laquelle est la plus vraie.",
    ],
    reversedDescriptions: [
      "Le conflit s'apaise, ou vous l'évitez quand il serait nécessaire.",
      "La compétition devient épuisante et sans but. Cherchez la sortie.",
      "Un désaccord intérieur non résolu se projette à l'extérieur sous forme de dispute.",
      "La lutte qui n'a plus de sens mais continue par inertie. Posez les bâtons.",
      "Le feu de la confrontation devenu pur chaos, sans rien à définir ni à défendre.",
    ],
  },

  27: {
    name: "Six de Bâtons",
    descriptions: [
      "La victoire est reconnue. Recevez la réussite avec grâce.",
      "Un succès public ou une reconnaissance arrive. Ce que vous avez accompli est visible.",
      "Vous revenez victorieux d'une épreuve. Ce retour n'est pas la fin — c'est une nouvelle position de départ.",
      "La gloire est éphémère, mais la confiance qu'elle donne est réelle. Usez-en sagement.",
      "Le six du feu : le héros qui revient, et dans son retour, inspire ceux qui n'ont pas encore osé partir.",
    ],
    reversedDescriptions: [
      "La reconnaissance tarde ou est injustement retenue. Cherchez la validation en vous-même.",
      "Une réussite est compromise par l'arrogance ou par des attentes mal placées.",
      "Vous cherchez l'approbation des autres avant d'avoir confiance en vous-même.",
      "La victoire qui isole plutôt qu'elle ne rassemble. La hauteur du succès crée une distance.",
      "Le feu de la victoire qui brûle trop vite, consumant ce qu'il aurait dû nourrir.",
    ],
  },

  28: {
    name: "Sept de Bâtons",
    descriptions: [
      "Tenez votre position face aux adversités. Vous avez ce qu'il faut.",
      "La défense est nécessaire en ce moment. Maintenez ce que vous avez construit.",
      "Vous faites face à plusieurs oppositions simultanément. L'avantage est de votre côté si vous restez ferme.",
      "Le défi constant forge quelque chose de plus solide que le confort ne pourrait le faire.",
      "Le sept du feu : la volonté qui se prouve à elle-même en résistant à ce qui cherche à l'effacer.",
    ],
    reversedDescriptions: [
      "La défense excessive devient rigidité. Sachez quand céder du terrain.",
      "Vous abandonnez une position qui méritait d'être tenue, ou vous vous battez pour quelque chose qui n'en vaut pas la peine.",
      "La résistance par peur plutôt que par conviction. Examinez ce que vous défendez vraiment.",
      "L'épuisement du guerrier qui oublie pourquoi il se bat.",
      "Le feu qui se consume à défendre des frontières qui ne protègent plus rien d'essentiel.",
    ],
  },

  29: {
    name: "Huit de Bâtons",
    descriptions: [
      "Les choses s'accélèrent. Soyez prêt à agir rapidement.",
      "Ce qui était en attente se dénoue avec rapidité. Beaucoup arrive en même temps.",
      "Un message, une nouvelle, un mouvement décisif. L'énergie circule enfin librement.",
      "Les huit bâtons volent ensemble — pas en désordre, mais dans une direction précise. La rapidité ici est une grâce, non une menace.",
      "Le huit du feu : l'élan qui a traversé tous les obstacles et file maintenant droit au but.",
    ],
    reversedDescriptions: [
      "Retards et ralentissements. Ce qui devait arriver rapidement est bloqué.",
      "Des messages manqués ou mal interprétés créent de la confusion.",
      "La précipitation sans direction. Beaucoup d'énergie, peu de résultats.",
      "L'emballement qui se retourne : ce qui allait trop vite arrive de travers.",
      "Le feu de la vitesse qui se transforme en incendie incontrôlable.",
    ],
  },

  30: {
    name: "Neuf de Bâtons",
    descriptions: [
      "Vous avez beaucoup traversé. La vigilance est encore de mise, mais vous êtes plus solide qu'il n'y paraît.",
      "Le dernier obstacle se profile. Vous avez les ressources pour le traverser.",
      "La résilience que vous avez développée est réelle. Ce qui cherche à vous ébranler rencontre quelqu'un qui a appris à tenir debout.",
      "Vous portez les marques de tout ce que vous avez traversé — et c'est votre force, pas votre faiblesse.",
      "Le neuf du feu : la volonté qui, malgré toutes les épreuves, refuse de laisser la flamme s'éteindre.",
    ],
    reversedDescriptions: [
      "La méfiance excessive crée des obstacles là où il n'y en a pas.",
      "L'épuisement vous rend vulnérable. Cherchez du soutien.",
      "Des blessures non guéries compromettent votre capacité à avancer.",
      "Vous protégez ce qui ne mérite plus d'être protégé, au détriment de ce qui mérite de croître.",
      "Le feu de la résistance qui consume le guerrier plutôt que ses ennemis.",
    ],
  },

  31: {
    name: "Dix de Bâtons",
    descriptions: [
      "Vous portez trop. Il est temps de déposer une partie du fardeau.",
      "La charge est lourde, mais le but est proche. Évaluez ce qui est vraiment nécessaire à emporter.",
      "L'excès de responsabilité pèse sur vos épaules. Certains fardeaux que vous portez ne vous appartiennent pas.",
      "La surabondance du feu : trop de projets, trop d'engagements, trop de volonté dirigée vers trop de directions à la fois.",
      "Le dix du feu : la force qui s'est chargée de tout et qui approche de la limite de ce qu'elle peut porter.",
    ],
    reversedDescriptions: [
      "Le poids commence à se lever. Une décharge ou une délégation est possible.",
      "Vous vous libérez d'une charge excessive — ou vous en prenez davantage par peur de vous arrêter.",
      "La responsabilité abandonnée là où elle était nécessaire. Le fardeau déposé de façon irresponsable.",
      "L'effondrement sous le poids de ce que vous avez accepté. Quelque chose cède.",
      "Le feu primordial de la volonté qui s'éteint sous le poids de ce qu'il a tenté de porter seul.",
    ],
  },

  32: {
    name: "Valet de Bâton",
    descriptions: [
      "L'enthousiasme est là. Une nouvelle aventure cherche à commencer.",
      "Le messager du feu apporte des nouvelles d'un monde à explorer. Soyez curieux.",
      "L'énergie juvénile du feu s'exprime ici : inspiration, spontanéité, volonté de se lancer sans calcul.",
      "Le Valet de Bâton porte la flamme avant même de savoir ce qu'il en fera. C'est sa force.",
      "L'étincelle primordiale incarnée : la joie pure de commencer, avant que l'expérience ne tempère l'ardeur.",
    ],
    reversedDescriptions: [
      "L'enthousiasme mal canalisé ou prématurément éteint. Manque de suite dans les idées.",
      "L'impatience compromet un bon départ. Ce qui est commencé n'est pas encore maîtrisé.",
      "L'énergie du feu tourne à vide — beaucoup de chaleur, peu de lumière.",
      "Le jeune homme qui brûle ses bâtons sans rien construire.",
      "L'étincelle sans bois — l'enthousiasme qui ne trouve pas sur quoi s'appuyer.",
    ],
  },

  33: {
    name: "Cavalier de Bâton",
    descriptions: [
      "Passez à l'action avec ardeur. Le moment est à l'aventure.",
      "Une énergie puissante vous porte en avant. Agissez, mais gardez une direction.",
      "Le Cavalier du feu avance vite et sans hésitation. Sa force est son élan ; son risque est l'impulsivité.",
      "Ce qui se présente demande que vous avanciez avec tout ce que vous avez, sans vous ménager.",
      "Le feu en mouvement : la passion qui se saisit d'un objectif et galope droit vers lui.",
    ],
    reversedDescriptions: [
      "L'impulsivité sans direction crée des dégâts. Ralentissez pour reconsidérer.",
      "L'élan du feu se tourne contre lui-même ou contre ce qu'il voulait défendre.",
      "La précipitation vous fait rater ce que la lenteur vous aurait permis de voir.",
      "Le cavalier qui galope sans savoir vers quoi — l'action frénétique comme fuite de l'immobilité.",
      "Le feu déchaîné qui n'est plus guidé par aucune main.",
    ],
  },

  34: {
    name: "Reine de Bâton",
    descriptions: [
      "Avancez avec confiance et chaleur. Votre énergie inspire ceux qui vous entourent.",
      "Vous portez le feu de la créativité avec maîtrise et générosité. Partagez-le.",
      "La Reine de Bâton est le feu discipliné : ardente mais pas dévorante, visionnaire mais ancrée dans le réel.",
      "Votre charisme naturel est une force. Utilisez-le au service de quelque chose qui en vaut la peine.",
      "Le feu maîtrisé et rayonnant : la créatrice qui a appris à nourrir sa flamme sans la laisser brûler ce qu'elle aime.",
    ],
    reversedDescriptions: [
      "L'énergie se retourne en jalousie ou en domination. La chaleur devient brûlure.",
      "La confiance en soi est ébranlée, ou vous cherchez à contrôler là où il faudrait créer.",
      "Le feu trop contenu s'étouffe, ou trop libéré, il brûle les ponts.",
      "La reine qui règne par la peur plutôt que par l'inspiration.",
      "Le feu féminin du monde qui oublie sa propre nature créatrice.",
    ],
  },

  35: {
    name: "Roi de Bâton",
    descriptions: [
      "Dirigez avec vision et intégrité. Votre leadership naturel est une ressource.",
      "La maîtrise du feu signifie savoir quand l'allumer, quand le nourrir, et quand le laisser s'éteindre.",
      "Vous êtes dans votre element : créateur, visionnaire, capable d'inspirer et d'agir. Votre moment est venu.",
      "Le Roi de Bâton règne non par l'autorité, mais par la force de son caractère. Ce qu'il embrasse s'embrase.",
      "Le feu primordial maîtrisé par une conscience qui a traversé toutes ses formes et en est revenu souverain.",
    ],
    reversedDescriptions: [
      "Un abus d'autorité ou un manque de vision compromet ce qui aurait pu être accompli.",
      "Le leadership se fait tyrannique ou se dérobe quand il est le plus nécessaire.",
      "Le roi qui brûle son royaume pour prouver qu'il est roi.",
      "La force créatrice détournée vers la domination. Le feu qui consume ce qu'il devait éclairer.",
      "La souveraineté du feu renversée : le roi sans vision, et le royaume dans les cendres.",
    ],
  },

  // ─── Coupes (Cups) ──────────────────────────────────────────────────────────

  36: {
    name: "As de Coupe",
    descriptions: [
      "Une nouvelle vague émotionnelle s'ouvre. Laissez-vous toucher.",
      "L'amour ou la joie cherche à entrer dans votre vie. Ouvrez-vous à recevoir.",
      "Une coupe débordante de sentiments nouveaux vous est présentée. Ce qu'elle contient vient du plus profond.",
      "Le commencement de quelque chose d'intime et de vrai. L'eau qui monte est purifiante.",
      "Le calice primordial : l'eau de la conscience avant toute séparation, avant toute douleur.",
    ],
    reversedDescriptions: [
      "Une ouverture émotionnelle est bloquée. La coupe est renversée ou vide.",
      "L'amour que vous cherchez à donner ou à recevoir rencontre un obstacle.",
      "La peur de ressentir empêche l'expérience la plus précieuse d'entrer.",
      "La coupe brisée : la capacité à aimer ou à être touché qui se ferme sur elle-même.",
      "L'eau primordiale refusée : la source de tout sentiment qui tarit avant d'avoir pu couler.",
    ],
  },

  37: {
    name: "Deux de Coupes",
    descriptions: [
      "Une connexion sincère se fait ou se renforce. Accueillez-la.",
      "L'accord entre deux êtres — amical, amoureux, ou de tout autre nature — porte ici une promesse réelle.",
      "Le miroir de l'autre vous révèle. Ce que vous voyez dans cette rencontre est aussi le reflet de vous-même.",
      "L'union véritable n'efface pas les différences — elle les célèbre. Ce lien est une alchimie.",
      "Le deux des eaux : la reconnaissance mutuelle de deux âmes qui se retrouvent.",
    ],
    reversedDescriptions: [
      "Un désaccord ou une séparation fragilise ce qui avait commencé à s'unir.",
      "Une relation est déséquilibrée — l'un donne ce que l'autre ne peut pas recevoir.",
      "Ce qui semblait une connexion profonde révèle ses limites. L'honnêteté est nécessaire.",
      "Le miroir brisé : ce que vous projetez dans l'autre n'est pas ce qu'il est.",
      "Les deux eaux qui refusent de se mêler, chacune restant dans son propre récipient.",
    ],
  },

  38: {
    name: "Trois de Coupes",
    descriptions: [
      "Un moment de joie partagée et de célébration. Savourez-le.",
      "L'amitié et la communauté vous soutiennent. Laissez les autres participer à votre vie.",
      "La joie est démultipliée quand elle est partagée. Ce qui se passe ici touche plusieurs cœurs.",
      "La célébration n'est pas frivole — elle est le signe que quelque chose de beau a été créé ensemble.",
      "Le trois des eaux : la joie commune, l'abondance émotionnelle qui se déborde entre les êtres.",
    ],
    reversedDescriptions: [
      "La fête sonnée creux, ou l'excès qui ternit ce qui devrait être lumière.",
      "Un réseau de soutien est absent ou insuffisant. Vous êtes plus seul que vous ne devriez l'être.",
      "La superficialité d'une relation qui manque de substance sous les apparences festives.",
      "La célébration qui masque quelque chose de plus sombre. La joie performée plutôt que ressentie.",
      "Les eaux qui se mélangent de façon trouble, et la fête qui cache un deuil non avoué.",
    ],
  },

  39: {
    name: "Quatre de Coupes",
    descriptions: [
      "Une opportunité est là, mais vous ne la voyez pas encore. Ouvrez les yeux.",
      "L'insatisfaction actuelle est réelle, mais regardez ce qui vous est offert.",
      "Vous êtes dans une phase de questionnement intérieur. C'est utile — mais pas au point d'ignorer ce qui se présente.",
      "Le repli sur soi peut être fertile, mais le refus de regarder ce que la vie apporte est une forme de fermeture.",
      "Le quatre des eaux : la contemplation qui bascule vers le refus de l'expérience.",
    ],
    reversedDescriptions: [
      "Vous sortez enfin de l'apathie ou de la rumination. Quelque chose s'allume.",
      "Une offre longtemps ignorée retrouve de l'intérêt. Il n'est pas trop tard.",
      "La stagnation cède la place au mouvement. Le fond de la coupe était l'impulsion nécessaire.",
      "Le retour à l'engagement, après une période de retrait qui avait commencé à s'éterniser.",
      "Les eaux qui reprennent leur mouvement après avoir stagné.",
    ],
  },

  40: {
    name: "Cinq de Coupes",
    descriptions: [
      "Une perte est réelle. Permettez-vous de la pleurer.",
      "Ce qui s'est renversé ne peut pas être récupéré. Mais deux coupes sont encore debout.",
      "Vous êtes invité à regarder à la fois ce qui est perdu et ce qui reste. Le deuil est nécessaire, pas la cécité.",
      "La tristesse que vous portez est justifiée. Elle doit être traversée, pas contournée.",
      "Le cinq des eaux : la conscience de la perte, le visage tourné vers les coupes renversées.",
    ],
    reversedDescriptions: [
      "Le deuil commence à se résoudre. Vous vous tournez vers ce qui reste.",
      "Une perte déplorée au-delà de ce qu'elle mérite. Le moment est venu d'aller de l'avant.",
      "Vous refusez de voir les ressources qui restent debout. Tournez-vous.",
      "L'attachement au chagrin comme à une identité. Le deuil qui devient habitude.",
      "Les eaux renversées qui continuent de couler longtemps après que la coupe s'est vidée.",
    ],
  },

  41: {
    name: "Six de Coupes",
    descriptions: [
      "Un souvenir doux-amer remonte. Accueillez-le avec tendresse.",
      "Le passé revient, porteur d'une leçon ou d'une nostalgie. Quelle que soit sa forme, il a quelque chose à offrir.",
      "Un don vient du passé — souvenir, retour d'une ancienne relation, intuition ancienne qui reprend vie.",
      "L'innocence retrouvée n'est pas la naïveté retrouvée — c'est la capacité à s'émerveiller à nouveau.",
      "Le six des eaux : l'âme qui se retourne vers son origine pour se rappeler ce qu'elle avait oublié.",
    ],
    reversedDescriptions: [
      "Vous vivez trop dans le passé. Le présent réclame votre attention.",
      "Une nostalgie qui empêche d'avancer. Ce que vous regrettez n'était peut-être pas aussi parfait que votre mémoire le dit.",
      "Un retour sur le passé révèle quelque chose de douloureux qui n'avait pas encore été intégré.",
      "L'enfance idéalisée comme refuge face à un présent difficile. La fuite dans les souvenirs.",
      "Les eaux du passé qui refluent et inondent le présent.",
    ],
  },

  42: {
    name: "Sept de Coupes",
    descriptions: [
      "Plusieurs possibilités s'offrent. Toutes ne sont pas ce qu'elles semblent.",
      "Le désir et l'imagination sont actifs. Choisissez avec discernement plutôt que sous l'effet de l'illusion.",
      "Les coupes en suspension dans le ciel présentent tentation et rêve. Laquelle est réelle ?",
      "Le danger ici est la dispersion : trop de visions, trop d'options, et l'incapacité à choisir.",
      "Le sept des eaux : l'imagination qui prolifère au point de créer un monde parallèle plus séduisant que le réel.",
    ],
    reversedDescriptions: [
      "La clarté revient après une période d'illusion ou de confusion.",
      "Vous vous réveillez d'un rêve et prenez une décision réaliste.",
      "Une distraction ou une illusion est écartée. Le sol réapparaît sous vos pieds.",
      "La confusion qui se dissipe — ou qui s'épaissit encore davantage.",
      "Les mirages se dissolvent, laissant voir la réalité nue.",
    ],
  },

  43: {
    name: "Huit de Coupes",
    descriptions: [
      "Il est temps de partir. Ce que vous cherchez n'est plus ici.",
      "Vous vous éloignez de quelque chose qui ne vous nourrit plus. Ce départ demande du courage.",
      "Le voyage intérieur vous appelle. Laisser derrière soi n'est pas abandonner — c'est choisir.",
      "Huit coupes sont empilées avec soin, mais la neuvième manque. Vous le savez. C'est pour ça que vous partez.",
      "Le huit des eaux : la quête qui recommence parce que ce qui était là n'était pas tout.",
    ],
    reversedDescriptions: [
      "Vous revenez vers quelque chose que vous aviez quitté. Est-ce un retour choisi ou une fuite ?",
      "Le départ est retardé par la peur du vide ou l'attachement à ce qui est connu.",
      "Vous cherchez une sortie pour de mauvaises raisons. Ce que vous fuyez vous suivra.",
      "L'errance sans but qui remplace la quête orientée.",
      "Les eaux qui coulent à rebours, vers ce qu'elles avaient déjà traversé.",
    ],
  },

  44: {
    name: "Neuf de Coupes",
    descriptions: [
      "La satisfaction est là, et elle est méritée. Savourez ce que vous avez.",
      "Un désir profond s'est réalisé ou est en voie de l'être. Cela ne va pas de soi.",
      "La coupe intérieure est pleine. Ce que vous avez désiré s'est manifesté, et il est juste de s'en réjouir.",
      "La véritable satisfaction vient non du fait d'avoir tout, mais d'être en accord avec ce que vous avez choisi.",
      "Le neuf des eaux : l'âme repue, le cœur réconcilié avec ce qui est.",
    ],
    reversedDescriptions: [
      "La satisfaction est de surface — quelque chose d'essentiel manque encore.",
      "Le bonheur apparent masque un manque non reconnu. Regardez plus loin.",
      "L'autocompassion excessive ou la tendance à se complaire dans le confort.",
      "Ce que vous croyez désirer n'est peut-être pas ce dont vous avez besoin.",
      "Le neuf renversé : la coupe pleine d'une eau qui n'étanche pas la vraie soif.",
    ],
  },

  45: {
    name: "Dix de Coupes",
    descriptions: [
      "La complétude dans l'amour et la paix. Ce qui a été construit ensemble est durable.",
      "La plénitude émotionnelle est accessible. Le foyer que vous cherchez peut exister.",
      "L'arc-en-ciel des coupes — la promesse tenue. Quelque chose de beau s'est accompli dans la relation et le cœur.",
      "Le bonheur ici n'est pas l'absence de douleur, mais la présence d'un sens partagé.",
      "Le dix des eaux : l'âme qui s'est reconnue dans l'autre, et dans cette reconnaissance, trouve le repos.",
    ],
    reversedDescriptions: [
      "La dislocation familiale ou relationnelle crée des fissures dans ce qui devrait être un appui.",
      "Une promesse de bonheur n'est pas tenue. Quelque chose s'est défait.",
      "Vous cherchez la plénitude à l'extérieur de vous-même, là où elle ne peut être trouvée.",
      "L'idéal émotionnel utilisé comme fuir du présent imparfait.",
      "Les eaux du bonheur se retirent, laissant une rive asséchée.",
    ],
  },

  46: {
    name: "Valet de Coupe",
    descriptions: [
      "Un message émotionnel ou intuitif arrive. Écoutez ce qu'il apporte.",
      "La sensibilité est un don, pas une faiblesse. Ce que vous ressentez mérite attention.",
      "L'imaginaire et l'intuition sont vifs. Permettez-vous d'explorer ce qui émerge.",
      "Le Valet de Coupe est le messager de l'intériorité — ce qui surgit de lui n'a pas encore de forme définie, mais il porte quelque chose de vrai.",
      "L'eau dans sa forme la plus jeune : sensible, réceptive, n'ayant pas encore appris à filtrer ce qu'elle ressent.",
    ],
    reversedDescriptions: [
      "La sensibilité est étouffée ou mal dirigée. Les émotions débordent sans trouver de forme.",
      "Un message est ignoré ou mal interprété. L'intuitif est rejeté au profit du rationnel.",
      "La naïveté émotionnelle crée des malentendus.",
      "Le jeune émotif qui noie son entourage dans ses ressentis non filtrés.",
      "L'eau qui déborde avant d'avoir appris à tenir dans un récipient.",
    ],
  },

  47: {
    name: "Cavalier de Coupe",
    descriptions: [
      "Suivez votre cœur dans cette direction. L'amour ou l'art vous appelle.",
      "Un message romantique ou créatif est en route. Il vient avec sincérité.",
      "Le Cavalier de Coupe avance doucement mais avec conviction. Il suit un courant intérieur.",
      "La quête de sens et de beauté est ici la force directrice. Laissez-la vous guider.",
      "L'eau en mouvement, portée par la vision d'un idéal — le graal qui oriente le voyage.",
    ],
    reversedDescriptions: [
      "Les émotions deviennent capricieuses ou la quête romantique tourne à la déception.",
      "L'idéal est poursuivi au détriment du réel. Le beau rêve ignore la réalité.",
      "Un charme superficiel dissimule un manque de profondeur réelle.",
      "Le cavalier qui court après un idéal impossible, laissant derrière lui ce qui est vraiment précieux.",
      "L'eau qui se perd dans les sables sans trouver la mer.",
    ],
  },

  48: {
    name: "Reine de Coupe",
    descriptions: [
      "Faites confiance à votre sensibilité. C'est une intelligence à part entière.",
      "La compassion que vous offrez ou recevez en ce moment est un soutien réel.",
      "La Reine de Coupe habite ses émotions avec sagesse. Elle ressent tout, mais n'est submergée par rien.",
      "Votre capacité à tenir l'espace pour les émotions des autres est un don rare. Protégez-vous autant que vous les soutenez.",
      "L'eau maîtrisée dans sa forme la plus sage : profonde, claire, et capable de refléter le monde sans le déformer.",
    ],
    reversedDescriptions: [
      "La sensibilité devient fragilité ou manipulation émotionnelle.",
      "Vous vous noyez dans les émotions des autres au détriment des vôtres.",
      "La compassion qui s'épuise ou se retourne. Les limites sont nécessaires.",
      "La reine qui se perd dans la mer de ce qu'elle ressent, oubliant sa propre rive.",
      "L'eau qui noie ce qu'elle voulait nourrir.",
    ],
  },

  49: {
    name: "Roi de Coupe",
    descriptions: [
      "Dirigez avec le cœur autant qu'avec la tête. L'intelligence émotionnelle est votre force.",
      "Vous tenez ensemble la raison et le sentiment sans sacrifier l'un à l'autre.",
      "Le Roi de Coupe règne sur ses eaux intérieures. Il n'est pas submergé par ce qu'il ressent — il le gouverne.",
      "La maturité émotionnelle que vous avez acquise vous permet d'être un soutien pour les autres sans vous perdre.",
      "L'eau souveraine : profonde, calme, et portant en elle toute la sagesse de ce qui a été traversé et intégré.",
    ],
    reversedDescriptions: [
      "La maîtrise émotionnelle cède sous la pression. L'eau déborde ou se fige.",
      "Une manipulation émotionnelle est à l'œuvre — en vous ou autour de vous.",
      "La froideur ou la distance émotionnelle se présente comme de la sagesse. Mais l'eau immobile pourrit.",
      "Le roi qui noie son royaume pour prouver qu'il sait nager.",
      "L'eau primordiale de la sagesse émotionnelle qui s'écoule sans trouver de rivage.",
    ],
  },

  // ─── Épées (Swords) ─────────────────────────────────────────────────────────

  50: {
    name: "As d'Épée",
    descriptions: [
      "La clarté arrive. Une vérité se révèle nettement.",
      "L'épée de l'esprit tranche les illusions. Ce qui était confus devient clair.",
      "Un nouveau regard est possible. La capacité à voir les choses telles qu'elles sont — sans atténuation — est un pouvoir.",
      "L'As d'Épée est double tranchant : la vérité qu'il révèle peut libérer ou blesser selon l'intention qui la porte.",
      "L'esprit primordial avant tout mot : la coupure qui permet à la conscience de se différencier du monde.",
    ],
    reversedDescriptions: [
      "La clarté est voilée. Une confusion persiste ou une décision tarde.",
      "La vérité est disponible, mais quelque chose résiste à la voir.",
      "L'épée mal maniée blesse là où elle devrait trancher.",
      "Le tranchant de l'esprit retourné contre lui-même. La critique comme destruction.",
      "Le vide de l'esprit sans la lumière qui l'oriente.",
    ],
  },

  51: {
    name: "Deux d'Épées",
    descriptions: [
      "Une décision difficile est suspendue. Vous évitez de choisir.",
      "L'équilibre précaire dans lequel vous vous trouvez est temporaire. Il faudra trancher.",
      "Les deux épées croisées maintiennent une paix forcée. Ce qui est bloqué devra se résoudre.",
      "L'attente peut être une sagesse — mais elle peut aussi être une fuite. Examinez ce qui vous retient.",
      "Le deux de l'esprit : la dualité qui s'affronte et ne peut pas coexister indéfiniment.",
    ],
    reversedDescriptions: [
      "La décision est enfin prise, ou le blocage cède.",
      "Ce qui était évité devient inévitable. La confrontation peut être saine.",
      "Un accord imposé se brise, laissant apparaître le conflit réel.",
      "La rationalisation comme écran entre vous et une vérité que vous refusez d'admettre.",
      "Les deux épées qui tombent — et avec elles, la fausse paix.",
    ],
  },

  52: {
    name: "Trois d'Épées",
    descriptions: [
      "Une douleur est réelle. Ne la minimisez pas.",
      "Le chagrin que vous portez mérite d'être reconnu. La pluie nettoie.",
      "Quelque chose a blessé le cœur — trahison, perte, désillusion. Laissez la douleur être ce qu'elle est.",
      "Les trois épées dans le cœur ne sont pas là pour toujours. Mais elles sont là maintenant, et les voir est le commencement de la guérison.",
      "Le trois de l'esprit : la pensée qui a atteint le cœur, et le cœur qui saigne.",
    ],
    reversedDescriptions: [
      "La guérison commence. La douleur se transforme lentement.",
      "Un chagrin est refoulé plutôt que traversé. Il reviendra.",
      "La douleur est utilisée comme arme ou identité. Elle ne peut pas guérir ainsi.",
      "Vous rumininez des blessures passées plutôt que de les relâcher.",
      "Les épées retirées, mais les cicatrices pas encore reconnues pour ce qu'elles ont enseigné.",
    ],
  },

  53: {
    name: "Quatre d'Épées",
    descriptions: [
      "Reposez-vous. Votre esprit et votre corps ont besoin de récupérer.",
      "Une pause stratégique est necessaire. Ce n'est pas la défaite — c'est la préparation.",
      "Le silence après la bataille permet d'intégrer ce qui a été vécu. Accordez-vous ce silence.",
      "Le retrait temporaire n'est pas la retraite — c'est la respiration avant le prochain mouvement.",
      "Le quatre de l'esprit : la pensée qui s'apaise, le guerrier qui rend les armes le temps d'une nuit.",
    ],
    reversedDescriptions: [
      "La période de repos est terminée. Il est temps de reprendre l'action.",
      "Vous résistez à un repos nécessaire, ou le repos devient fuite.",
      "L'isolement qui se prolonge au-delà de son utilité.",
      "L'épuisement qui ne peut plus être ignoré. Le corps réclame ce que l'esprit refuse.",
      "Les épées qui ne se posent jamais, et l'esprit qui ne trouve plus de silence.",
    ],
  },

  54: {
    name: "Cinq d'Épées",
    descriptions: [
      "Vous avez peut-être gagné la bataille, mais au quel prix ? Examinez les conséquences.",
      "Un conflit laisse des traces. Ce qui a été dit ou fait ne peut pas être effacé.",
      "La victoire obtenue par des moyens injustes n'est pas une vraie victoire.",
      "Ce qui s'est passé ici a abîmé quelque chose. La question est : que faites-vous de ce constat ?",
      "Le cinq de l'esprit : la défaite ou la victoire creuse, et ce vide qui demande une réponse.",
    ],
    reversedDescriptions: [
      "Une réconciliation est possible. Quelque chose d'abîmé peut se réparer.",
      "Un conflit se résout, ou vous sortez d'une dynamique destructrice.",
      "La honte ou le regret d'actions passées commence à se transformer.",
      "Vous revenez sur une situation difficile avec plus de sagesse — ou moins.",
      "Le champ de bataille se vide, et les questions demeurent.",
    ],
  },

  55: {
    name: "Six d'Épées",
    descriptions: [
      "Vous traversez une période difficile vers quelque chose de plus calme. Continuez.",
      "Le passage n'est pas facile, mais l'eau devant vous est plus douce que celle derrière.",
      "Vous emportez avec vous les épées de ce que vous avez vécu. Elles ne disparaissent pas, mais elles ne sont plus dans le cœur.",
      "La transition en cours est nécessaire. Ce que vous quittez, même si c'est douloureux, ne pouvait plus vous accueillir.",
      "Le six de l'esprit : le voyage vers la clarté, porté par la conviction que là-bas vaut mieux qu'ici.",
    ],
    reversedDescriptions: [
      "Le passage est retardé ou refusé. Vous résistez à la transition.",
      "Ce qui devait être laissé derrière vous revient. La barque fait demi-tour.",
      "Une ancienne situation refait surface. Quelque chose n'avait pas été réglé.",
      "La destination que vous cherchez à atteindre n'est peut-être pas ce que vous croyez.",
      "Les eaux troubles qui n'arrivent pas à se calmer malgré la traversée.",
    ],
  },

  56: {
    name: "Sept d'Épées",
    descriptions: [
      "Quelque chose se fait en secret ou en évitant la confrontation. Examinez votre stratégie.",
      "Une approche indirecte peut être nécessaire — mais à quel coût pour votre intégrité ?",
      "La ruse peut être une forme d'intelligence dans certains contextes. Mais sachez ce que vous dérobez et pourquoi.",
      "Tout ce qui est fait dans l'ombre finit par être vu. Évaluez ce risque.",
      "Le sept de l'esprit : l'astuce qui permet de survivre là où la force serait inutile.",
    ],
    reversedDescriptions: [
      "Un stratagème est découvert. La vérité émerge.",
      "Vous renoncez à une approche malhonnête. L'honnêteté reprend sa place.",
      "Ce qui vous a été dissimulé se révèle. Vous pouvez voir clairement.",
      "La tromperie — la vôtre ou celle d'autrui — revient avec des conséquences.",
      "Les épées volées finissent par peser trop lourd.",
    ],
  },

  57: {
    name: "Huit d'Épées",
    descriptions: [
      "Vous vous sentez pris au piège, mais les liens sont moins solides qu'ils n'y paraissent.",
      "Les contraintes que vous percevez sont en partie des constructions mentales. Regardez autour de vous.",
      "Quelque chose vous retient — mais qui a posé les épées autour de vous ? Et qui a noué le bandeau ?",
      "La prison est réelle dans votre perception. C'est de là qu'il faut partir pour commencer à l'examiner.",
      "Le huit de l'esprit : l'esprit qui s'est lui-même emprisonné dans ses propres limites.",
    ],
    reversedDescriptions: [
      "Une contrainte se desserre. Une porte que vous n'aviez pas vue s'ouvre.",
      "Vous commencez à voir comment vous avez participé à votre propre limitation.",
      "La libération est proche, mais la peur de l'espace ouvert est réelle.",
      "Le retour dans la prison après un début de libération. L'habitude de la cage.",
      "Les épées qui tombent, et l'effroi de se retrouver sans protection.",
    ],
  },

  58: {
    name: "Neuf d'Épées",
    descriptions: [
      "Les pensées nocturnes vous pèsent. Ce que vous ruminez a besoin d'être examiné à la lumière.",
      "L'anxiété est réelle. Mais elle dit peut-être plus de ce que vous portez que de ce qui va vraiment se passer.",
      "Le désespoir de minuit est son heure la plus puissante — et la moins fiable. Attendez l'aube.",
      "Neuf épées au-dessus du lit : ce sont les pensées, pas les faits. Examinez leur prise.",
      "Le neuf de l'esprit : la conscience qui s'est retournée contre elle-même dans la nuit.",
    ],
    reversedDescriptions: [
      "L'anxiété commence à se résorber. La nuit cède à l'aube.",
      "Vous demandez de l'aide, ou vous vous permettez enfin de ne pas aller bien.",
      "Une peur persistante se révèle infondée — ou bien réelle et nommée enfin.",
      "La rumination qui tourne en cercle sans s'épuiser. L'esprit qui refuse le repos.",
      "Les neuf épées qui continuent à planer même quand le jour se lève.",
    ],
  },

  59: {
    name: "Dix d'Épées",
    descriptions: [
      "Un cycle difficile se referme définitivement. Quelque chose est terminé.",
      "Aussi douloureux que soit cet ending, il libère la possibilité de quelque chose de neuf.",
      "La défaite totale est aussi une clé. Quand tout est tombé, il n'y a plus rien à défendre.",
      "Dix épées dans le dos : c'est fini. Ce qui vient ne peut qu'être différent.",
      "Le dix de l'esprit : la fin du cycle de souffrance mentale — non par victoire, mais par épuisement et abandon.",
    ],
    reversedDescriptions: [
      "La survie après la défaite. Vous étiez à terre, et vous êtes encore là.",
      "Un retour — non pas à ce qui était, mais à quelque chose de nouveau, après la plus sombre des nuits.",
      "Vous résistez à une fin nécessaire, prolongeant une agonie qui devrait se conclure.",
      "L'ère post-catastrophe : reconstruire à partir de rien est possible mais exige tout.",
      "Les épées qui se retirent lentement, et la promesse difficile de se relever.",
    ],
  },

  60: {
    name: "Valet d'Épée",
    descriptions: [
      "Soyez alerte et curieux. Observez avant d'agir.",
      "Un jeune esprit affûté cherche à comprendre. La vigilance est une vertu ici.",
      "Ce que vous voyez mérite d'être examiné avec soin. Ne sautez pas aux conclusions.",
      "Le Valet d'Épée est le chercheur de vérité — enthousiaste, rapide, pas encore sage, mais déterminé.",
      "L'esprit dans sa forme la plus jeune : vif, curieux, capable de tout voir, pas encore capable de tout comprendre.",
    ],
    reversedDescriptions: [
      "La curiosité tourne à la fouine, ou la vivacité d'esprit à la cruauté verbale.",
      "Des informations incomplètes vous conduisent à des conclusions fausses.",
      "L'esprit trop tranchant blesse ce qu'il voulait examiner.",
      "Le valet qui joue avec les épées sans en maîtriser le danger.",
      "La vigilance qui tourne à la paranoïa.",
    ],
  },

  61: {
    name: "Cavalier d'Épée",
    descriptions: [
      "Avancez avec courage et décision. Le moment est à l'action nette.",
      "Une cause juste mérite un engagement entier. Lancez-vous.",
      "Le Cavalier d'Épée n'hésite pas. Sa force est la clarté de sa vision ; son risque est la précipitation.",
      "Ce qui se présente demande une réponse directe et rapide. Pas le moment pour la nuance.",
      "L'esprit en mouvement vers sa vérité, les cheveux dans le vent, sans regarder derrière lui.",
    ],
    reversedDescriptions: [
      "La précipitation crée des dommages collatéraux. Ralentissez pour réfléchir.",
      "L'agressivité remplace la clarté. Le tranchant de l'épée blesse sans discernement.",
      "Une bataille est menée pour des raisons qui ne tiennent plus à l'examen.",
      "Le cavalier qui charge à travers ses propres alliés dans l'ardeur de la mêlée.",
      "L'épée tournée contre ce qu'elle voulait défendre.",
    ],
  },

  62: {
    name: "Reine d'Épée",
    descriptions: [
      "Voyez clairement. Dites ce qui est vrai, avec tact mais sans détour.",
      "Votre discernement est une force en ce moment. Faites-lui confiance.",
      "La Reine d'Épée a connu la douleur et en a tiré une clarté que le bonheur facile ne donne pas.",
      "La vérité que vous portez mérite d'être partagée — avec précision, non avec rudesse.",
      "L'esprit affiné par l'expérience : la coupe peut-être vide, mais la vision est nette et le jugement juste.",
    ],
    reversedDescriptions: [
      "La clarté se transforme en froideur ou en sévérité. Le tranchant blesse au lieu d'éclairer.",
      "Un ressentiment non digéré colore votre perception. La rancœur fausse le jugement.",
      "Vous utilisez la logique comme mur entre vous et ce que vous ressentez réellement.",
      "La reine dont la lame a coupé tous les liens qui auraient pu la soutenir.",
      "L'esprit isolé par sa propre clarté, trop tranchant pour être touché.",
    ],
  },

  63: {
    name: "Roi d'Épée",
    descriptions: [
      "Décidez avec équité et intelligence. La vérité doit guider.",
      "Votre capacité d'analyse et votre autorité intellectuelle sont des ressources au service du juste.",
      "Le Roi d'Épée juge avec rigueur mais sans malice. Il sert la vérité, pas ses propres intérêts.",
      "La maîtrise de l'esprit permet de prendre des décisions difficiles sans se laisser submerger.",
      "L'intelligence primordiale souveraine : l'esprit qui a traversé toutes ses contradictions et règne maintenant dans la clarté.",
    ],
    reversedDescriptions: [
      "Le pouvoir intellectuel est exercé sans compassion. La froideur devient tyrannie.",
      "Un jugement injuste ou une autorité mal exercée crée des injustices.",
      "Vous utilisez votre intelligence pour manipuler plutôt que pour clarifier.",
      "Le roi qui fait de la Loi une arme contre ceux qu'il était censé protéger.",
      "La clarté primordiale de l'esprit obscurcie par l'égo ou la peur.",
    ],
  },

  // ─── Deniers (Pentacles) ────────────────────────────────────────────────────

  64: {
    name: "As de Denier",
    descriptions: [
      "Une nouvelle opportunité concrète émerge. Elle mérite votre engagement.",
      "Le début d'un projet matériel ou d'une nouvelle source de stabilité. La graine est là.",
      "Ce qui est offert en ce moment porte la promesse d'une richesse réelle — pas nécessairement l'argent, mais ce qui nourrit.",
      "L'As de Denier est la main de la terre qui vous tend un présent. À vous d'en prendre soin.",
      "La matière primordiale avant toute forme : la potentialité de tout ce qui peut croître dans le monde visible.",
    ],
    reversedDescriptions: [
      "Une opportunité est manquée ou mal saisie. La graine ne trouve pas de terre fertile.",
      "La richesse matérielle est poursuivie au détriment de ce qui a vraiment de la valeur.",
      "Un début prometteur est compromis par un manque de préparation ou de soin.",
      "Le don de la terre refusé — par orgueil, distraction ou crainte de la responsabilité.",
      "La graine primordiale qui pourrit avant d'avoir germé.",
    ],
  },

  65: {
    name: "Deux de Denier",
    descriptions: [
      "Gérez plusieurs demandes à la fois avec souplesse. L'équilibre est possible.",
      "La jonglerie actuelle est temporaire. Trouvez le rythme qui vous permet de tenir.",
      "Adaptabilité et flexibilité sont vos ressources en ce moment. Ne cherchez pas la stabilité parfaite.",
      "Les deux deniers en mouvement : ce qui semble instable est peut-être une danse, non un déséquilibre.",
      "Le deux de la terre : l'élan vital qui apprend à naviguer dans la dualité sans perdre l'équilibre.",
    ],
    reversedDescriptions: [
      "La jonglerie devient trop complexe. Quelque chose doit être déposé.",
      "Un déséquilibre financier ou pratique se creuse. Prenez-le au sérieux.",
      "Vous gérez trop et négligez ce qui est le plus important.",
      "L'instabilité chronique qui passe pour de la flexibilité — mais qui épuise.",
      "Les deniers qui tombent parce que les mains ne peuvent plus tenir.",
    ],
  },

  66: {
    name: "Trois de Denier",
    descriptions: [
      "La collaboration et le travail d'équipe portent leurs fruits. Valorisez l'expertise des autres.",
      "Ce qui est construit ensemble est plus solide que ce qui est bâti seul.",
      "Votre compétence est reconnue. Le travail bien fait mérite d'être vu.",
      "Le maître artisan et ses compagnons : chacun apporte ce que l'autre ne peut donner, et l'ouvrage dépasse ce que chacun aurait pu imaginer seul.",
      "Le trois de la terre : la matière mise en forme par des mains expertes et coordonnées.",
    ],
    reversedDescriptions: [
      "Un manque de communication ou de coopération fragilise un projet commun.",
      "Le travail n'est pas reconnu à sa juste valeur, ou la compétence est sous-utilisée.",
      "Des conflits d'ego compromettent ce qui aurait pu être une belle collaboration.",
      "La médiocrité consentie : l'effort sans conviction, et le résultat qui le reflète.",
      "La pierre posée de travers, et l'édifice qui vacille.",
    ],
  },

  67: {
    name: "Quatre de Denier",
    descriptions: [
      "Ce que vous avez est suffisant. Apprenez à vous y appuyer.",
      "La sécurité que vous cherchez peut se trouver dans ce que vous possédez déjà.",
      "La prudence et la conservation sont des vertus — jusqu'au moment où elles deviennent des chaînes.",
      "Vous tenez fermement à ce qui est vôtre. Demandez-vous si ce que vous gardez vaut ce que cette garde vous coûte.",
      "Le quatre de la terre : la matière qui se protège, se consolide, et parfois se fossilise.",
    ],
    reversedDescriptions: [
      "Lâchez un peu de contrôle. Ce que vous retenez étouffe ce qui cherche à croître.",
      "L'avarice ou la peur de manquer vous emprisonne dans une abondance que vous ne pouvez pas jouir.",
      "Une perte est possible ou imminente — apprenez à lâcher avant qu'on ne prenne.",
      "L'attachement aux possessions au détriment des relations ou de l'évolution.",
      "Le denier serré dans le poing jusqu'à ce qu'il n'ait plus de valeur.",
    ],
  },

  68: {
    name: "Cinq de Denier",
    descriptions: [
      "Une période de manque ou d'exclusion est difficile. Cherchez le soutien disponible.",
      "La pauvreté ici n'est pas nécessairement financière — elle peut être émotionnelle ou spirituelle.",
      "Même dans le froid, il y a des lumières. Regardez ce qui est disponible, même si cela demande de l'humilité.",
      "Ce que vous vivez comme une exclusion est peut-être aussi une invitation à trouver de l'aide là où vous ne la cherchiez pas.",
      "Le cinq de la terre : la matière qui manque, et la conscience qui cherche malgré tout un abri.",
    ],
    reversedDescriptions: [
      "Une période difficile commence à se résoudre. L'aide arrive ou est en route.",
      "Vous refusez le soutien disponible par orgueil. Laissez-vous aider.",
      "La reprise est possible si vous acceptez de modifier votre approche.",
      "La sortie de la pauvreté — matérielle ou autre — par un chemin que vous n'aviez pas envisagé.",
      "La lumière de la fenêtre que vous aviez cessé de voir.",
    ],
  },

  69: {
    name: "Six de Denier",
    descriptions: [
      "La générosité circule — que vous soyez celui qui donne ou celui qui reçoit.",
      "L'équilibre dans l'échange est une forme de justice. Ici, quelque chose se rééquilibre.",
      "Donner et recevoir sont deux aspects d'un même geste. Honorez les deux.",
      "La richesse qui circule enrichit tout le monde. Tenez-vous dans cette générosité sans calcul.",
      "Le six de la terre : la balance de la matière qui cherche son juste équilibre entre les mains.",
    ],
    reversedDescriptions: [
      "La générosité est déséquilibrée — trop ou trop peu, dans un sens ou dans l'autre.",
      "Un don est fait avec des conditions cachées. La générosité masque un contrôle.",
      "Vous donnez ce que vous n'avez pas, ou vous retenez ce que vous pourriez partager.",
      "La charité qui humilie plutôt qu'elle n'élève.",
      "Les deniers distribués à contrecœur, et la richesse qui perd son sens dans le mouvement.",
    ],
  },

  70: {
    name: "Sept de Denier",
    descriptions: [
      "Évaluez ce que vous avez cultivé. Y a-t-il des ajustements nécessaires ?",
      "La patience est requise. Ce que vous avez semé n'est pas encore prêt à être récolté.",
      "Faites le point à mi-chemin. Le travail a été accompli, mais la récolte n'est pas garantie.",
      "Le cultivateur qui s'arrête pour regarder ses plants : ni trop tôt, ni trop tard.",
      "Le sept de la terre : la patience de l'agriculteur face aux rythmes de la nature.",
    ],
    reversedDescriptions: [
      "L'impatience compromet la récolte. Vous cueillez avant maturité.",
      "Un investissement — de temps, d'argent, d'énergie — ne produit pas ce qu'il devrait.",
      "Vous continuez à investir dans quelque chose qui ne donnera pas de fruit. Il est peut-être temps de replanter.",
      "La procrastination masquée en patience. Rien ne pousse si on ne l'arrose pas.",
      "Les graines laissées dans la terre sans soin, et la récolte qui ne vient pas.",
    ],
  },

  71: {
    name: "Huit de Denier",
    descriptions: [
      "La maîtrise vient de la pratique répétée. Continuez votre apprentissage.",
      "Le travail minutieux et patient porte en lui sa propre récompense.",
      "Vous affinez une compétence. Ce que vous faites en ce moment construit quelque chose de durable.",
      "L'artisan qui perfectionne son geste : chaque pièce est identique à la précédente, et pourtant chacune enseigne quelque chose de nouveau.",
      "Le huit de la terre : la maîtrise qui se construit dans la répétition consciente.",
    ],
    reversedDescriptions: [
      "Le travail est effectué sans attention ou sans passion. La qualité en souffre.",
      "Une compétence est sous-utilisée, ou vous vous perdez dans les détails au détriment de l'ensemble.",
      "L'artisanat sans âme : les mains qui travaillent pendant que l'esprit est ailleurs.",
      "La perfectionnisme qui immobilise plutôt qu'il n'améliore.",
      "Les pièces identiques qui ne sont jamais assez bonnes.",
    ],
  },

  72: {
    name: "Neuf de Denier",
    descriptions: [
      "Vous avez construit quelque chose de beau. Prenez le temps d'en jouir.",
      "L'indépendance que vous avez développée est une richesse réelle. Célébrez-la.",
      "Ce moment d'abondance autorisée est mérité. Permettez-vous de le vivre pleinement.",
      "La satisfaction du travail accompli, seul, par ses propres moyens — c'est une forme de liberté rare.",
      "Le neuf de la terre : la dame du jardin qui a tout cultivé elle-même et s'en réjouit sans ambiguïté.",
    ],
    reversedDescriptions: [
      "L'abondance est sapée par l'insécurité ou le sentiment de ne pas la mériter.",
      "Ce que vous avez construit est en risque, ou vous en profitez de façon irresponsable.",
      "La dépendance financière ou matérielle compromet votre liberté.",
      "Le luxe sans plaisir : l'abondance possédée mais non ressentie.",
      "Le jardin magnifique dont on ne jouit pas par peur de le perdre.",
    ],
  },

  73: {
    name: "Dix de Denier",
    descriptions: [
      "Ce qui a été construit au fil du temps est solide et durable. Reconnaissez sa valeur.",
      "L'héritage — qu'il soit matériel, culturel ou familial — porte quelque chose d'important.",
      "La permanence et la continuité sont en jeu. Ce que vous bâtissez maintenant sera transmis.",
      "Le dix de Denier est la richesse qui a traversé le temps — non seulement l'argent, mais les valeurs, les liens, le sens.",
      "Le dix de la terre : la matière qui s'est transformée en legs, et le legs qui dépasse tous ceux qui l'ont créé.",
    ],
    reversedDescriptions: [
      "Un héritage est compromis ou les fondations familiales sont instables.",
      "Ce qui devait durer s'effrite. Un réexamen des valeurs fondamentales s'impose.",
      "Une richesse matérielle qui ne correspond pas à une richesse intérieure. Le trésor cache une vacuité.",
      "Les disputes autour de l'héritage qui brisent ce que l'héritage devait maintenir.",
      "Les fondations de la maison qui cèdent, et tout ce qu'elles portaient qui s'effondre avec.",
    ],
  },

  74: {
    name: "Valet de Denier",
    descriptions: [
      "Commencez à apprendre sérieusement. La matière et les compétences méritent votre attention.",
      "Une opportunité d'apprentissage pratique se présente. Saisissez-la avec humilité.",
      "Le Valet de Denier est l'étudiant qui regarde son denier avec attention — il sait qu'il ne comprend pas encore tout, mais il est prêt à travailler.",
      "La diligence et la curiosité pratique sont vos meilleurs outils en ce moment.",
      "La terre dans sa forme la plus jeune : stable, curieuse, prête à s'engager dans le monde réel.",
    ],
    reversedDescriptions: [
      "Le manque de rigueur ou de discipline compromet un apprentissage important.",
      "Une opportunité pratique est négligée ou mal saisie.",
      "L'élève qui regarde son denier sans jamais décider de quoi en faire.",
      "La paresse ou la procrastination qui déguisent une peur du réel.",
      "La graine qui tarde à germer parce que le sol n'a pas été préparé.",
    ],
  },

  75: {
    name: "Cavalier de Denier",
    descriptions: [
      "Avancez méthodiquement. La régularité et la persévérance vous mèneront au but.",
      "Ce qui est accompli pas à pas est plus durable que ce qui est fait dans l'élan.",
      "Le Cavalier de Denier n'est pas rapide, mais il est fiable. Ce qu'il entreprend, il le finit.",
      "La lenteur délibérée est une forme de sagesse — surtout quand la tâche le requiert.",
      "La terre en mouvement : lente, sûre, et incapable d'abandonner ce qu'elle a commencé.",
    ],
    reversedDescriptions: [
      "La lenteur devient stagnation. Un manque de mouvement compromet ce qui pourrait être accompli.",
      "La routine excessive étouffe toute possibilité d'adaptation.",
      "Un engagement est pris sans être tenu. La fiabilité fait défaut.",
      "Le cavalier qui s'enlise dans la boue sans chercher un autre chemin.",
      "La patience de la terre qui se transforme en inertie.",
    ],
  },

  76: {
    name: "Reine de Denier",
    descriptions: [
      "Prenez soin de ce qui est sous votre responsabilité — personnes, projets, ou ressources.",
      "L'abondance que vous cultivez bénéficie à tous ceux qui vous entourent.",
      "La Reine de Denier est ancrée dans le monde réel. Son pouvoir est dans sa capacité à nourrir et à faire prospérer.",
      "Votre sens pratique et votre générosité sont des ressources précieuses. Ne les sous-estimez pas.",
      "La terre souveraine qui nourrit sans se vider — la maîtresse de ce qui pousse, de ce qui dure.",
    ],
    reversedDescriptions: [
      "Le soin se transforme en contrôle, ou les ressources sont mal gérées.",
      "Un épuisement du donneur : vous avez tellement donné que vous n'avez plus rien à vous donner.",
      "L'insécurité financière ou matérielle fragilise ce que vous cherchez à bâtir.",
      "La reine dont le jardin s'asphyxie parce qu'elle a tout voulu tenir elle-même.",
      "La terre qui ne nourrit plus parce qu'on lui a trop demandé.",
    ],
  },

  77: {
    name: "Roi de Denier",
    descriptions: [
      "Gérez vos ressources et vos responsabilités avec sagesse et générosité.",
      "Ce que vous avez construit est solide. Veillez sur lui et faites-en profiter les autres.",
      "Le Roi de Denier est le maître de la matière — non pour thésauriser, mais pour faire fructifier.",
      "Votre stabilité et votre ancrage sont une force pour vous et pour ceux qui vous entourent.",
      "La terre primordiale maîtrisée par une conscience qui a tout traversé et règne dans l'abondance sage.",
    ],
    reversedDescriptions: [
      "La richesse est mal gérée ou utilisée pour dominer plutôt que pour soutenir.",
      "L'obstination matérielle empêche l'adaptation nécessaire.",
      "Un roi qui a amassé tout ce qu'il avait peur de perdre, et perdu tout ce qui méritait d'être gardé.",
      "La corruption du sens pratique en avarice ou en arrogance.",
      "Le roi de la terre qui a oublié que la terre lui a tout donné, et qui réclame ce qu'il n'a pas mérité.",
    ],
  },
};
