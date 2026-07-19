// Quiz content sourced from BCScience8_GateReferenceTable_v1.md.
// `correct` is the index into `options`. `misconception` on a wrong option is
// shown on the teacher dashboard when that option is the most-picked wrong answer.
export const GATES = [
  {
    id: 1,
    label: "Gate 1 — Cell Theory",
    type: "Recognition",
    question: "Which of these is NOT one of the three main ideas of cell theory?",
    options: [
      "All living things are made of cells",
      "Cells need sunlight to survive",
      "The cell is the smallest unit of life",
      "All cells come from pre-existing cells",
    ],
    correct: 1,
    misconceptions: {
      1: "Confuses cell theory (applies to all living things) with a photosynthesis-specific requirement (applies only to plant/algae cells) — a common mix-up at this grade level.",
    },
    feedback:
      "Cell theory has three parts: all living things are made of cells, the cell is the smallest unit of life, and all cells come from pre-existing cells. Needing sunlight is a plant-specific thing — that's photosynthesis, not cell theory.",
  },
  {
    id: 2,
    label: "Gate 2 — Vacuole / Turgor Pressure",
    type: "Application",
    question:
      "A student left her plant in a dark closet for a week. It started to wilt. Which organelle is most directly responsible for keeping the plant firm and upright?",
    options: ["Nucleus", "Mitochondria", "The vacuole", "Cell membrane"],
    correct: 2,
    misconceptions: {
      0: "Over-generalizes that the nucleus (the 'control center') is responsible for structural jobs it has no role in.",
      1: "Conflates energy production with structure — mitochondria are 'important,' so the student assumes it explains any visible physical change.",
      3: "The most dangerous distractor: the membrane does control water movement, so 'water loss → membrane' is an almost-right reason to land here. Worth watching closely.",
    },
    feedback:
      "The vacuole's basically a water tank — when it's full, it pushes out against the cell wall and keeps everything rigid. No water, no push, no structure. That's the wilt.",
  },
  {
    id: 3,
    label: "Gate 3 — Cell Wall",
    type: "Recognition",
    question:
      "Which of the following structures is found in a plant cell but NOT in an animal cell?",
    options: ["Cell membrane", "Nucleus", "Mitochondria", "Cell wall"],
    correct: 3,
    misconceptions: {
      0: "Confuses membrane (present in both plant and animal cells) with wall (plant-only) — students often use 'wall' and 'membrane' interchangeably before instruction. The single most common error at this grade level.",
      1: "Believes some organelles are plant-only vs. animal-only across the board, rather than knowing the nucleus is shared by both.",
      2: "Same misconception as nucleus, applied to mitochondria — assumes it's plant-exclusive.",
    },
    feedback:
      "The cell wall is the plant-only structure — animal cells have a membrane, but nothing rigid outside it. Plants need that extra structure since they can't move to protect themselves.",
  },
  {
    id: 4,
    label: "Gate 4 — Immune Response / Energy Cost",
    type: "Application",
    question:
      "Why does your body feel tired when you're sick, even if you're just lying still?",
    options: [
      "Your brain tells your muscles to rest so they don't get infected",
      "Your cells are using energy to fight the infection, leaving less for everything else",
      "Viruses block the cell membrane from letting nutrients in",
      "Your vacuoles release stored water, which makes you feel heavy",
    ],
    correct: 1,
    misconceptions: {
      0: "A folk-biology 'common sense' answer (rest as deliberate strategy) that skips cellular mechanism entirely — not really a cell-science misconception.",
      2: "A real but wrong mechanism guess: the student correctly identifies the membrane as a gatekeeper, but misapplies that idea here. A sign the membrane concept landed, just misfired.",
      3: "Conflates the vacuole (plant-cell-heavy content) with a human-body symptom — a sign the plant/animal distinction didn't fully stick.",
    },
    feedback:
      "Your immune cells are working overtime, and that work costs energy — the same ATP your muscles would normally use to keep you moving. Sick or not, your body's still spending the same fuel. It's just spending it somewhere else.",
  },
];

export const OPTION_LETTERS = ["A", "B", "C", "D"];
