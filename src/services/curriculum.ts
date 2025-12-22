/**
 * ICSE/ISC Curriculum Standards
 * Based on official CISCE (Council for the Indian School Certificate Examinations) syllabus 2024-2025
 */

// Type Definitions
export type Board = 'ICSE' | 'ISC';

export interface Topic {
    name: string;
    subtopics?: string[];
}

export interface Chapter {
    name: string;
    topics: Topic[];
}

export interface Subject {
    name: string;
    chapters: Chapter[];
}

export interface ClassCurriculum {
    classNumber: number;
    board: Board;
    subjects: Subject[];
}

// Class 8 Curriculum (ICSE)
const class8Curriculum: ClassCurriculum = {
    classNumber: 8,
    board: 'ICSE',
    subjects: [
        {
            name: 'Mathematics',
            chapters: [
                { name: 'Rational Numbers', topics: [{ name: 'Properties of Rational Numbers' }, { name: 'Representation on Number Line' }] },
                { name: 'Exponents and Powers', topics: [{ name: 'Laws of Exponents' }, { name: 'Standard Form' }] },
                { name: 'Squares and Square Roots', topics: [{ name: 'Properties of Square Numbers' }, { name: 'Finding Square Roots' }] },
                { name: 'Cubes and Cube Roots', topics: [{ name: 'Perfect Cubes' }, { name: 'Cube Root Methods' }] },
                { name: 'Playing with Numbers', topics: [{ name: 'Divisibility Tests' }, { name: 'Number Puzzles' }] },
                { name: 'Algebraic Expressions', topics: [{ name: 'Addition and Subtraction' }, { name: 'Multiplication' }] },
                { name: 'Factorisation', topics: [{ name: 'Common Factors' }, { name: 'Factorisation by Grouping' }] },
                { name: 'Linear Equations', topics: [{ name: 'Solving Linear Equations' }, { name: 'Word Problems' }] },
                { name: 'Percentage and Its Applications', topics: [{ name: 'Profit and Loss' }, { name: 'Discount' }, { name: 'Simple Interest' }] },
                { name: 'Compound Interest', topics: [{ name: 'Formula and Computation' }, { name: 'Applications' }] },
                { name: 'Direct and Inverse Variation', topics: [{ name: 'Direct Proportion' }, { name: 'Inverse Proportion' }] },
                { name: 'Time and Work', topics: [{ name: 'Work Done' }, { name: 'Pipes and Cisterns' }] },
                { name: 'Geometry', topics: [{ name: 'Polygons' }, { name: 'Quadrilaterals' }, { name: 'Construction' }] },
                { name: 'Area and Perimeter', topics: [{ name: 'Trapezium' }, { name: 'Rhombus' }, { name: 'Polygon' }] },
                { name: 'Volume and Surface Area', topics: [{ name: 'Cube and Cuboid' }, { name: 'Cylinder' }] },
                { name: 'Data Handling', topics: [{ name: 'Pie Charts' }, { name: 'Probability Introduction' }] },
            ]
        },
        {
            name: 'Physics',
            chapters: [
                { name: 'Matter', topics: [{ name: 'States of Matter' }, { name: 'Change of State' }] },
                { name: 'Physical Quantities and Measurement', topics: [{ name: 'SI Units' }, { name: 'Measurement Techniques' }] },
                { name: 'Force and Pressure', topics: [{ name: 'Types of Forces' }, { name: 'Pressure in Fluids' }] },
                { name: 'Energy', topics: [{ name: 'Forms of Energy' }, { name: 'Energy Transformation' }] },
                { name: 'Light Energy', topics: [{ name: 'Reflection' }, { name: 'Mirrors' }] },
                { name: 'Heat Transfer', topics: [{ name: 'Conduction' }, { name: 'Convection' }, { name: 'Radiation' }] },
                { name: 'Sound', topics: [{ name: 'Production of Sound' }, { name: 'Propagation' }] },
            ]
        },
        {
            name: 'Chemistry',
            chapters: [
                { name: 'Matter', topics: [{ name: 'Classification of Matter' }, { name: 'Properties' }] },
                { name: 'Physical and Chemical Changes', topics: [{ name: 'Differences' }, { name: 'Examples' }] },
                { name: 'Elements, Compounds and Mixtures', topics: [{ name: 'Definitions' }, { name: 'Separation Techniques' }] },
                { name: 'Atomic Structure', topics: [{ name: 'Atoms and Molecules' }, { name: 'Subatomic Particles' }] },
                { name: 'Language of Chemistry', topics: [{ name: 'Symbols' }, { name: 'Formulae' }, { name: 'Equations' }] },
                { name: 'Chemical Reactions', topics: [{ name: 'Types of Reactions' }, { name: 'Balancing Equations' }] },
            ]
        },
        {
            name: 'Biology',
            chapters: [
                { name: 'Transport of Food and Minerals in Plants', topics: [{ name: 'Xylem and Phloem' }, { name: 'Transpiration' }] },
                { name: 'Reproduction in Plants', topics: [{ name: 'Asexual Reproduction' }, { name: 'Sexual Reproduction' }] },
                { name: 'The Cell', topics: [{ name: 'Cell Structure' }, { name: 'Cell Organelles' }] },
                { name: 'Human Body Systems', topics: [{ name: 'Circulatory System' }, { name: 'Respiratory System' }] },
                { name: 'Health and Hygiene', topics: [{ name: 'Diseases' }, { name: 'Prevention' }] },
                { name: 'Ecosystems', topics: [{ name: 'Food Chains' }, { name: 'Food Webs' }] },
            ]
        },
    ]
};

// Class 9 Curriculum (ICSE)
const class9Curriculum: ClassCurriculum = {
    classNumber: 9,
    board: 'ICSE',
    subjects: [
        {
            name: 'Mathematics',
            chapters: [
                { name: 'Rational and Irrational Numbers', topics: [{ name: 'Properties' }, { name: 'Surds' }] },
                { name: 'Compound Interest', topics: [{ name: 'Growth and Depreciation' }, { name: 'Using Formula' }] },
                { name: 'Expansions', topics: [{ name: 'Algebraic Identities' }, { name: 'Special Products' }] },
                { name: 'Factorisation', topics: [{ name: 'Factor Theorem' }, { name: 'Factorisation Methods' }] },
                { name: 'Simultaneous Linear Equations', topics: [{ name: 'Graphical Method' }, { name: 'Algebraic Methods' }] },
                { name: 'Indices', topics: [{ name: 'Laws of Indices' }, { name: 'Negative and Fractional Indices' }] },
                { name: 'Logarithms', topics: [{ name: 'Laws of Logarithms' }, { name: 'Applications' }] },
                { name: 'Triangles', topics: [{ name: 'Congruence' }, { name: 'Similarity' }] },
                { name: 'Pythagoras Theorem', topics: [{ name: 'Proof' }, { name: 'Applications' }] },
                { name: 'Rectilinear Figures', topics: [{ name: 'Quadrilaterals' }, { name: 'Parallelograms' }] },
                { name: 'Circle', topics: [{ name: 'Chords' }, { name: 'Arcs' }, { name: 'Cyclic Quadrilaterals' }] },
                { name: 'Statistics', topics: [{ name: 'Mean, Median, Mode' }, { name: 'Frequency Distribution' }] },
                { name: 'Mean and Median', topics: [{ name: 'Grouped Data' }, { name: 'Ogive' }] },
                { name: 'Area and Perimeter of Plane Figures', topics: [{ name: 'Composite Figures' }, { name: 'Applications' }] },
                { name: 'Solids', topics: [{ name: 'Surface Area' }, { name: 'Volume' }] },
                { name: 'Trigonometrical Ratios', topics: [{ name: 'Sine, Cosine, Tangent' }, { name: 'Trigonometric Identities' }] },
                { name: 'Coordinate Geometry', topics: [{ name: 'Distance Formula' }, { name: 'Section Formula' }] },
            ]
        },
        {
            name: 'Physics',
            chapters: [
                { name: 'Measurements and Experimentation', topics: [{ name: 'Physical Quantities' }, { name: 'Vernier Caliper' }, { name: 'Screw Gauge' }] },
                { name: 'Motion in One Dimension', topics: [{ name: 'Speed and Velocity' }, { name: 'Acceleration' }, { name: 'Equations of Motion' }] },
                { name: 'Laws of Motion', topics: [{ name: 'Newton\'s Laws' }, { name: 'Momentum' }, { name: 'Conservation of Momentum' }] },
                { name: 'Fluids', topics: [{ name: 'Pressure in Fluids' }, { name: 'Buoyancy' }, { name: 'Archimedes\' Principle' }] },
                { name: 'Heat and Energy', topics: [{ name: 'Heat Capacity' }, { name: 'Specific Heat' }, { name: 'Latent Heat' }] },
                { name: 'Light', topics: [{ name: 'Reflection' }, { name: 'Refraction' }, { name: 'Lenses' }] },
                { name: 'Sound', topics: [{ name: 'Wave Motion' }, { name: 'Characteristics of Sound' }, { name: 'Echo' }] },
                { name: 'Electricity and Magnetism', topics: [{ name: 'Static Electricity' }, { name: 'Current Electricity Basics' }] },
            ]
        },
        {
            name: 'Chemistry',
            chapters: [
                { name: 'The Language of Chemistry', topics: [{ name: 'Symbols and Formulae' }, { name: 'Chemical Equations' }] },
                { name: 'Chemical Changes and Reactions', topics: [{ name: 'Types of Reactions' }, { name: 'Energy Changes' }] },
                { name: 'Water', topics: [{ name: 'Composition' }, { name: 'Properties' }, { name: 'Water Pollution' }] },
                { name: 'Atomic Structure and Chemical Bonding', topics: [{ name: 'Electron Configuration' }, { name: 'Ionic and Covalent Bonds' }] },
                { name: 'The Periodic Table', topics: [{ name: 'Periods and Groups' }, { name: 'Periodic Trends' }] },
                { name: 'Study of Gas Laws', topics: [{ name: 'Boyle\'s Law' }, { name: 'Charles\'s Law' }, { name: 'Combined Gas Law' }] },
                { name: 'Atmospheric Pollution', topics: [{ name: 'Air Pollutants' }, { name: 'Acid Rain' }, { name: 'Global Warming' }] },
            ]
        },
        {
            name: 'Biology',
            chapters: [
                { name: 'Basic Biology', topics: [{ name: 'Characteristics of Living Things' }, { name: 'Cell Structure' }] },
                { name: 'Flowering Plants', topics: [{ name: 'Structure of Flower' }, { name: 'Pollination' }, { name: 'Fertilisation' }] },
                { name: 'Plant Physiology', topics: [{ name: 'Photosynthesis' }, { name: 'Respiration' }, { name: 'Transpiration' }] },
                { name: 'Diversity in Living Organisms', topics: [{ name: 'Classification' }, { name: 'Five Kingdom Classification' }] },
                { name: 'Human Anatomy and Physiology', topics: [{ name: 'Digestive System' }, { name: 'Circulatory System' }, { name: 'Respiratory System' }] },
                { name: 'Health and Hygiene', topics: [{ name: 'Diseases and Prevention' }, { name: 'Immunity' }] },
                { name: 'Waste Generation and Management', topics: [{ name: 'Types of Waste' }, { name: 'Waste Disposal Methods' }] },
            ]
        },
    ]
};

// Class 10 Curriculum (ICSE)
const class10Curriculum: ClassCurriculum = {
    classNumber: 10,
    board: 'ICSE',
    subjects: [
        {
            name: 'Mathematics',
            chapters: [
                { name: 'GST (Goods and Services Tax)', topics: [{ name: 'Computation of Tax' }, { name: 'Problems with Discount and Profit/Loss' }] },
                { name: 'Banking', topics: [{ name: 'Recurring Deposits' }, { name: 'Maturity Value Calculation' }] },
                { name: 'Shares and Dividends', topics: [{ name: 'Face Value and Market Value' }, { name: 'Dividend Calculation' }, { name: 'Return on Investment' }] },
                { name: 'Linear Inequations', topics: [{ name: 'Solving Inequations' }, { name: 'Graphical Representation' }] },
                { name: 'Quadratic Equations', topics: [{ name: 'Factorisation Method' }, { name: 'Quadratic Formula' }, { name: 'Nature of Roots' }] },
                { name: 'Ratio and Proportion', topics: [{ name: 'Componendo and Dividendo' }, { name: 'Mean Proportion' }] },
                { name: 'Factorisation of Polynomials', topics: [{ name: 'Factor Theorem' }, { name: 'Remainder Theorem' }] },
                { name: 'Matrices', topics: [{ name: 'Types of Matrices' }, { name: 'Matrix Operations' }, { name: 'Identity and Null Matrix' }] },
                { name: 'Arithmetic Progression', topics: [{ name: 'nth Term' }, { name: 'Sum of n Terms' }] },
                { name: 'Geometric Progression', topics: [{ name: 'nth Term' }, { name: 'Sum of n Terms' }] },
                { name: 'Coordinate Geometry', topics: [{ name: 'Section Formula' }, { name: 'Midpoint Formula' }, { name: 'Slope and Equation of Line' }] },
                { name: 'Similarity', topics: [{ name: 'Similar Triangles' }, { name: 'Basic Proportionality Theorem' }, { name: 'Areas of Similar Triangles' }] },
                { name: 'Loci', topics: [{ name: 'Locus Theorems' }, { name: 'Constructions' }] },
                { name: 'Circles', topics: [{ name: 'Angle Properties' }, { name: 'Cyclic Properties' }, { name: 'Tangent Properties' }] },
                { name: 'Constructions', topics: [{ name: 'Construction of Tangents' }, { name: 'Circumscribed and Inscribed Circles' }] },
                { name: 'Mensuration', topics: [{ name: 'Cylinder' }, { name: 'Cone' }, { name: 'Sphere' }, { name: 'Combined Solids' }] },
                { name: 'Trigonometry', topics: [{ name: 'Trigonometric Identities' }, { name: 'Heights and Distances' }] },
                { name: 'Statistics', topics: [{ name: 'Mean' }, { name: 'Median' }, { name: 'Mode' }, { name: 'Histogram and Ogive' }] },
                { name: 'Probability', topics: [{ name: 'Simple Probability' }, { name: 'Sample Space' }] },
            ]
        },
        {
            name: 'Physics',
            chapters: [
                { name: 'Force, Work, Power and Energy', topics: [{ name: 'Turning Effect of Force' }, { name: 'Work and Energy' }, { name: 'Power' }, { name: 'Machines' }] },
                { name: 'Light', topics: [{ name: 'Refraction at Plane Surfaces' }, { name: 'Refraction through Lenses' }, { name: 'Spectrum' }, { name: 'Eye Defects' }] },
                { name: 'Sound', topics: [{ name: 'Reflection of Sound' }, { name: 'Natural Vibrations' }, { name: 'Forced Vibrations' }, { name: 'Resonance' }] },
                { name: 'Electricity and Magnetism', topics: [{ name: 'Ohm\'s Law' }, { name: 'Electrical Circuits' }, { name: 'Household Electricity' }, { name: 'Magnetic Effect of Current' }] },
                { name: 'Heat', topics: [{ name: 'Calorimetry' }, { name: 'Latent Heat' }] },
                { name: 'Modern Physics', topics: [{ name: 'Radioactivity' }, { name: 'Nuclear Energy' }] },
            ]
        },
        {
            name: 'Chemistry',
            chapters: [
                { name: 'Periodic Table', topics: [{ name: 'Periodic Properties' }, { name: 'Periodicity' }] },
                { name: 'Chemical Bonding', topics: [{ name: 'Electrovalent Bonding' }, { name: 'Covalent Bonding' }, { name: 'Coordinate Bonding' }] },
                { name: 'Acids, Bases and Salts', topics: [{ name: 'Properties' }, { name: 'pH Scale' }, { name: 'Preparation of Salts' }] },
                { name: 'Analytical Chemistry', topics: [{ name: 'Identification of Cations' }, { name: 'Identification of Anions' }] },
                { name: 'Mole Concept', topics: [{ name: 'Molar Mass' }, { name: 'Mole Calculations' }, { name: 'Stoichiometry' }] },
                { name: 'Electrolysis', topics: [{ name: 'Electrolytes' }, { name: 'Electrode Reactions' }, { name: 'Applications' }] },
                { name: 'Metallurgy', topics: [{ name: 'Extraction of Metals' }, { name: 'Aluminium and Iron' }] },
                { name: 'Study of Compounds', topics: [{ name: 'Hydrogen Chloride' }, { name: 'Ammonia' }, { name: 'Nitric Acid' }, { name: 'Sulphuric Acid' }] },
                { name: 'Organic Chemistry', topics: [{ name: 'Hydrocarbons' }, { name: 'Alcohols' }, { name: 'Carboxylic Acids' }] },
            ]
        },
        {
            name: 'Biology',
            chapters: [
                { name: 'Cell Cycle and Division', topics: [{ name: 'Mitosis' }, { name: 'Meiosis' }] },
                { name: 'Genetics', topics: [{ name: 'Mendel\'s Laws' }, { name: 'Monohybrid and Dihybrid Cross' }, { name: 'Sex Determination' }] },
                { name: 'Plant Physiology', topics: [{ name: 'Absorption by Roots' }, { name: 'Photosynthesis' }, { name: 'Transpiration' }] },
                { name: 'Human Anatomy and Physiology', topics: [{ name: 'Circulatory System' }, { name: 'Excretory System' }, { name: 'Nervous System' }, { name: 'Endocrine System' }] },
                { name: 'Reproduction', topics: [{ name: 'Reproductive System' }, { name: 'Menstrual Cycle' }, { name: 'Fertilisation' }, { name: 'Population Control' }] },
                { name: 'Pollution', topics: [{ name: 'Air, Water, Soil Pollution' }, { name: 'Effects and Control' }] },
            ]
        },
    ]
};

// Class 11 Curriculum (ISC)
const class11Curriculum: ClassCurriculum = {
    classNumber: 11,
    board: 'ISC',
    subjects: [
        {
            name: 'Mathematics',
            chapters: [
                { name: 'Sets', topics: [{ name: 'Types of Sets' }, { name: 'Set Operations' }, { name: 'Venn Diagrams' }] },
                { name: 'Relations and Functions', topics: [{ name: 'Types of Relations' }, { name: 'Types of Functions' }, { name: 'Composition of Functions' }] },
                { name: 'Trigonometric Functions', topics: [{ name: 'Trigonometric Ratios' }, { name: 'Trigonometric Equations' }, { name: 'Identities' }] },
                { name: 'Principle of Mathematical Induction', topics: [{ name: 'Process of Induction' }, { name: 'Simple Applications' }] },
                { name: 'Complex Numbers', topics: [{ name: 'Algebra of Complex Numbers' }, { name: 'Argand Plane' }, { name: 'Polar Form' }] },
                { name: 'Quadratic Equations', topics: [{ name: 'Roots' }, { name: 'Nature of Roots' }] },
                { name: 'Linear Inequalities', topics: [{ name: 'Graphical Solution' }, { name: 'System of Inequalities' }] },
                { name: 'Permutations and Combinations', topics: [{ name: 'Fundamental Principle' }, { name: 'Permutations' }, { name: 'Combinations' }] },
                { name: 'Binomial Theorem', topics: [{ name: 'Binomial Expansion' }, { name: 'General Term' }] },
                { name: 'Sequences and Series', topics: [{ name: 'AP, GP, HP' }, { name: 'Sum of Series' }] },
                { name: 'Straight Lines', topics: [{ name: 'Slope' }, { name: 'Equations of Lines' }, { name: 'Distance Formulas' }] },
                { name: 'Conic Sections', topics: [{ name: 'Circle' }, { name: 'Parabola' }, { name: 'Ellipse' }, { name: 'Hyperbola' }] },
                { name: 'Three Dimensional Geometry', topics: [{ name: 'Coordinate Axes' }, { name: 'Distance Formula' }, { name: 'Section Formula' }] },
                { name: 'Limits and Derivatives', topics: [{ name: 'Limits' }, { name: 'Derivatives' }, { name: 'Differentiation' }] },
                { name: 'Statistics', topics: [{ name: 'Measures of Dispersion' }, { name: 'Variance' }, { name: 'Standard Deviation' }] },
                { name: 'Probability', topics: [{ name: 'Random Experiments' }, { name: 'Probability of Events' }] },
            ]
        },
        {
            name: 'Physics',
            chapters: [
                { name: 'Physical World and Measurement', topics: [{ name: 'Physics and Technology' }, { name: 'Units and Measurement' }, { name: 'Significant Figures' }] },
                { name: 'Kinematics', topics: [{ name: 'Motion in Straight Line' }, { name: 'Motion in Plane' }, { name: 'Projectile Motion' }] },
                { name: 'Laws of Motion', topics: [{ name: 'Newton\'s Laws' }, { name: 'Friction' }, { name: 'Circular Motion' }] },
                { name: 'Work, Energy and Power', topics: [{ name: 'Work-Energy Theorem' }, { name: 'Conservation of Energy' }, { name: 'Collisions' }] },
                { name: 'System of Particles', topics: [{ name: 'Centre of Mass' }, { name: 'Rotational Motion' }, { name: 'Angular Momentum' }] },
                { name: 'Gravitation', topics: [{ name: 'Kepler\'s Laws' }, { name: 'Gravitational Potential' }, { name: 'Orbital Velocity' }] },
                { name: 'Properties of Matter', topics: [{ name: 'Elasticity' }, { name: 'Surface Tension' }, { name: 'Viscosity' }] },
                { name: 'Thermodynamics', topics: [{ name: 'Laws of Thermodynamics' }, { name: 'Heat Engines' }, { name: 'Entropy' }] },
                { name: 'Kinetic Theory of Gases', topics: [{ name: 'Gas Laws' }, { name: 'Kinetic Interpretation of Temperature' }] },
                { name: 'Oscillations', topics: [{ name: 'SHM' }, { name: 'Damped and Forced Oscillations' }] },
                { name: 'Waves', topics: [{ name: 'Wave Motion' }, { name: 'Superposition' }, { name: 'Standing Waves' }] },
            ]
        },
        {
            name: 'Chemistry',
            chapters: [
                { name: 'Some Basic Concepts of Chemistry', topics: [{ name: 'Atomic and Molecular Mass' }, { name: 'Mole Concept' }, { name: 'Stoichiometry' }] },
                { name: 'Structure of Atom', topics: [{ name: 'Atomic Models' }, { name: 'Quantum Mechanics' }, { name: 'Electronic Configuration' }] },
                { name: 'Classification of Elements', topics: [{ name: 'Modern Periodic Table' }, { name: 'Periodic Trends' }] },
                { name: 'Chemical Bonding', topics: [{ name: 'VSEPR Theory' }, { name: 'Hybridisation' }, { name: 'Molecular Orbital Theory' }] },
                { name: 'States of Matter', topics: [{ name: 'Gas Laws' }, { name: 'Kinetic Theory' }, { name: 'Liquids' }] },
                { name: 'Thermodynamics', topics: [{ name: 'Enthalpy' }, { name: 'Entropy' }, { name: 'Gibbs Energy' }] },
                { name: 'Equilibrium', topics: [{ name: 'Chemical Equilibrium' }, { name: 'Ionic Equilibrium' }, { name: 'pH and Buffers' }] },
                { name: 'Redox Reactions', topics: [{ name: 'Oxidation Number' }, { name: 'Balancing Redox Equations' }] },
                { name: 'Hydrogen', topics: [{ name: 'Preparation' }, { name: 'Properties' }, { name: 'Hydrides' }] },
                { name: 's-Block Elements', topics: [{ name: 'Alkali Metals' }, { name: 'Alkaline Earth Metals' }] },
                { name: 'p-Block Elements', topics: [{ name: 'Group 13 and 14 Elements' }] },
                { name: 'Organic Chemistry Basics', topics: [{ name: 'IUPAC Nomenclature' }, { name: 'Isomerism' }, { name: 'Reaction Mechanisms' }] },
                { name: 'Hydrocarbons', topics: [{ name: 'Alkanes' }, { name: 'Alkenes' }, { name: 'Alkynes' }, { name: 'Aromatic Hydrocarbons' }] },
                { name: 'Environmental Chemistry', topics: [{ name: 'Pollution' }, { name: 'Green Chemistry' }] },
            ]
        },
        {
            name: 'Biology',
            chapters: [
                { name: 'The Living World', topics: [{ name: 'Characteristics of Life' }, { name: 'Taxonomy' }, { name: 'Binomial Nomenclature' }] },
                { name: 'Biological Classification', topics: [{ name: 'Five Kingdoms' }, { name: 'Viruses and Viroids' }] },
                { name: 'Plant Kingdom', topics: [{ name: 'Algae' }, { name: 'Bryophytes' }, { name: 'Pteridophytes' }, { name: 'Gymnosperms' }, { name: 'Angiosperms' }] },
                { name: 'Animal Kingdom', topics: [{ name: 'Classification of Animals' }, { name: 'Phyla' }] },
                { name: 'Morphology of Flowering Plants', topics: [{ name: 'Root, Stem, Leaf' }, { name: 'Flower, Fruit, Seed' }] },
                { name: 'Anatomy of Flowering Plants', topics: [{ name: 'Tissues' }, { name: 'Tissue Systems' }] },
                { name: 'Cell: The Unit of Life', topics: [{ name: 'Cell Theory' }, { name: 'Cell Organelles' }] },
                { name: 'Cell Cycle and Division', topics: [{ name: 'Cell Cycle' }, { name: 'Mitosis' }, { name: 'Meiosis' }] },
                { name: 'Biomolecules', topics: [{ name: 'Carbohydrates' }, { name: 'Proteins' }, { name: 'Lipids' }, { name: 'Nucleic Acids' }] },
                { name: 'Transport in Plants', topics: [{ name: 'Water Transport' }, { name: 'Mineral Nutrition' }] },
                { name: 'Photosynthesis', topics: [{ name: 'Light Reactions' }, { name: 'Calvin Cycle' }] },
                { name: 'Respiration in Plants', topics: [{ name: 'Glycolysis' }, { name: 'Krebs Cycle' }, { name: 'ETS' }] },
                { name: 'Plant Growth and Development', topics: [{ name: 'Plant Hormones' }, { name: 'Photoperiodism' }] },
                { name: 'Digestion and Absorption', topics: [{ name: 'Digestive System' }, { name: 'Enzymes' }] },
                { name: 'Breathing and Exchange of Gases', topics: [{ name: 'Respiratory System' }, { name: 'Gas Exchange' }] },
                { name: 'Body Fluids and Circulation', topics: [{ name: 'Blood' }, { name: 'Heart' }, { name: 'Circulatory Pathways' }] },
                { name: 'Excretory Products', topics: [{ name: 'Kidney' }, { name: 'Urine Formation' }] },
                { name: 'Locomotion and Movement', topics: [{ name: 'Skeletal System' }, { name: 'Muscular System' }] },
                { name: 'Neural Control and Coordination', topics: [{ name: 'Nervous System' }, { name: 'Reflex Action' }] },
                { name: 'Chemical Coordination', topics: [{ name: 'Endocrine Glands' }, { name: 'Hormones' }] },
            ]
        },
    ]
};

// Class 12 Curriculum (ISC)
const class12Curriculum: ClassCurriculum = {
    classNumber: 12,
    board: 'ISC',
    subjects: [
        {
            name: 'Mathematics',
            chapters: [
                { name: 'Relations and Functions', topics: [{ name: 'Types of Relations' }, { name: 'One-to-One and Onto Functions' }, { name: 'Inverse Functions' }] },
                { name: 'Inverse Trigonometric Functions', topics: [{ name: 'Principal Values' }, { name: 'Properties' }] },
                { name: 'Matrices', topics: [{ name: 'Types of Matrices' }, { name: 'Operations' }, { name: 'Inverse of Matrix' }] },
                { name: 'Determinants', topics: [{ name: 'Properties' }, { name: 'Area using Determinants' }, { name: 'Solution of Linear Equations' }] },
                { name: 'Continuity and Differentiability', topics: [{ name: 'Continuity' }, { name: 'Differentiability' }, { name: 'Chain Rule' }] },
                { name: 'Applications of Derivatives', topics: [{ name: 'Rate of Change' }, { name: 'Maxima and Minima' }, { name: 'Tangents and Normals' }] },
                { name: 'Integrals', topics: [{ name: 'Indefinite Integrals' }, { name: 'Definite Integrals' }, { name: 'Integration Methods' }] },
                { name: 'Applications of Integrals', topics: [{ name: 'Area Under Curves' }, { name: 'Area Between Curves' }] },
                { name: 'Differential Equations', topics: [{ name: 'Order and Degree' }, { name: 'Solution Methods' }] },
                { name: 'Vectors', topics: [{ name: 'Types of Vectors' }, { name: 'Scalar and Vector Products' }, { name: 'Triple Products' }] },
                { name: 'Three-Dimensional Geometry', topics: [{ name: 'Lines in 3D' }, { name: 'Planes' }, { name: 'Shortest Distance' }] },
                { name: 'Probability', topics: [{ name: 'Conditional Probability' }, { name: 'Bayes\' Theorem' }, { name: 'Random Variables' }] },
                { name: 'Linear Programming', topics: [{ name: 'Formulation' }, { name: 'Graphical Method' }] },
            ]
        },
        {
            name: 'Physics',
            chapters: [
                { name: 'Electrostatics', topics: [{ name: 'Coulomb\'s Law' }, { name: 'Electric Field' }, { name: 'Electric Potential' }, { name: 'Capacitors' }] },
                { name: 'Current Electricity', topics: [{ name: 'Ohm\'s Law' }, { name: 'Kirchhoff\'s Laws' }, { name: 'Wheatstone Bridge' }, { name: 'Potentiometer' }] },
                { name: 'Magnetic Effects of Current', topics: [{ name: 'Biot-Savart Law' }, { name: 'Ampere\'s Law' }, { name: 'Solenoid and Toroid' }] },
                { name: 'Magnetism and Matter', topics: [{ name: 'Magnetic Materials' }, { name: 'Earth\'s Magnetism' }] },
                { name: 'Electromagnetic Induction', topics: [{ name: 'Faraday\'s Laws' }, { name: 'Lenz\'s Law' }, { name: 'Self and Mutual Inductance' }] },
                { name: 'Alternating Current', topics: [{ name: 'AC Circuits' }, { name: 'Resonance' }, { name: 'Transformers' }] },
                { name: 'Electromagnetic Waves', topics: [{ name: 'EM Spectrum' }, { name: 'Properties' }] },
                { name: 'Ray Optics', topics: [{ name: 'Reflection and Refraction' }, { name: 'Optical Instruments' }] },
                { name: 'Wave Optics', topics: [{ name: 'Huygens\' Principle' }, { name: 'Interference' }, { name: 'Diffraction' }] },
                { name: 'Dual Nature of Radiation', topics: [{ name: 'Photoelectric Effect' }, { name: 'de Broglie Wavelength' }] },
                { name: 'Atoms', topics: [{ name: 'Rutherford Model' }, { name: 'Bohr Model' }, { name: 'Hydrogen Spectrum' }] },
                { name: 'Nuclei', topics: [{ name: 'Nuclear Properties' }, { name: 'Radioactivity' }, { name: 'Nuclear Reactions' }] },
                { name: 'Semiconductor Electronics', topics: [{ name: 'p-n Junction' }, { name: 'Diodes' }, { name: 'Transistors' }] },
            ]
        },
        {
            name: 'Chemistry',
            chapters: [
                { name: 'Solutions', topics: [{ name: 'Concentration Terms' }, { name: 'Colligative Properties' }, { name: 'Raoult\'s Law' }] },
                { name: 'Electrochemistry', topics: [{ name: 'Electrochemical Cells' }, { name: 'Nernst Equation' }, { name: 'Conductance' }] },
                { name: 'Chemical Kinetics', topics: [{ name: 'Rate of Reaction' }, { name: 'Order and Molecularity' }, { name: 'Arrhenius Equation' }] },
                { name: 'Surface Chemistry', topics: [{ name: 'Adsorption' }, { name: 'Catalysis' }, { name: 'Colloids' }] },
                { name: 'Isolation of Elements', topics: [{ name: 'Extraction Methods' }, { name: 'Thermodynamic Principles' }] },
                { name: 'p-Block Elements', topics: [{ name: 'Group 15-18 Elements' }, { name: 'Oxoacids' }] },
                { name: 'd and f Block Elements', topics: [{ name: 'Transition Metals' }, { name: 'Lanthanoids and Actinoids' }] },
                { name: 'Coordination Compounds', topics: [{ name: 'Werner\'s Theory' }, { name: 'IUPAC Nomenclature' }, { name: 'Isomerism' }, { name: 'Bonding' }] },
                { name: 'Haloalkanes and Haloarenes', topics: [{ name: 'Nomenclature' }, { name: 'SN1 and SN2 Reactions' }] },
                { name: 'Alcohols, Phenols and Ethers', topics: [{ name: 'Preparation' }, { name: 'Properties' }, { name: 'Reactions' }] },
                { name: 'Aldehydes, Ketones and Carboxylic Acids', topics: [{ name: 'Nucleophilic Addition' }, { name: 'Cannizzaro Reaction' }, { name: 'Aldol Condensation' }] },
                { name: 'Amines', topics: [{ name: 'Classification' }, { name: 'Preparation' }, { name: 'Diazonium Salts' }] },
                { name: 'Biomolecules', topics: [{ name: 'Carbohydrates' }, { name: 'Proteins' }, { name: 'Nucleic Acids' }, { name: 'Vitamins' }] },
                { name: 'Polymers', topics: [{ name: 'Classification' }, { name: 'Preparation Methods' }] },
                { name: 'Chemistry in Everyday Life', topics: [{ name: 'Drugs' }, { name: 'Chemicals in Food' }] },
            ]
        },
        {
            name: 'Biology',
            chapters: [
                { name: 'Reproduction in Organisms', topics: [{ name: 'Asexual Reproduction' }, { name: 'Sexual Reproduction' }] },
                { name: 'Sexual Reproduction in Flowering Plants', topics: [{ name: 'Pollination' }, { name: 'Double Fertilisation' }, { name: 'Seed and Fruit Formation' }] },
                { name: 'Human Reproduction', topics: [{ name: 'Male and Female Reproductive System' }, { name: 'Gametogenesis' }, { name: 'Menstrual Cycle' }] },
                { name: 'Reproductive Health', topics: [{ name: 'Population Control' }, { name: 'STDs' }, { name: 'Infertility' }] },
                { name: 'Principles of Inheritance', topics: [{ name: 'Mendel\'s Laws' }, { name: 'Chromosomal Inheritance' }, { name: 'Sex Determination' }] },
                { name: 'Molecular Basis of Inheritance', topics: [{ name: 'DNA Structure' }, { name: 'Replication' }, { name: 'Transcription' }, { name: 'Translation' }] },
                { name: 'Evolution', topics: [{ name: 'Origin of Life' }, { name: 'Natural Selection' }, { name: 'Human Evolution' }] },
                { name: 'Human Health and Diseases', topics: [{ name: 'Pathogens' }, { name: 'Immunity' }, { name: 'AIDS and Cancer' }] },
                { name: 'Microbes in Human Welfare', topics: [{ name: 'Industrial Products' }, { name: 'Sewage Treatment' }, { name: 'Biogas' }] },
                { name: 'Biotechnology Principles', topics: [{ name: 'Recombinant DNA' }, { name: 'PCR' }, { name: 'Gel Electrophoresis' }] },
                { name: 'Biotechnology Applications', topics: [{ name: 'GM Crops' }, { name: 'Gene Therapy' }] },
                { name: 'Organisms and Populations', topics: [{ name: 'Ecology' }, { name: 'Population Attributes' }] },
                { name: 'Ecosystem', topics: [{ name: 'Energy Flow' }, { name: 'Ecological Pyramids' }, { name: 'Nutrient Cycling' }] },
                { name: 'Biodiversity and Conservation', topics: [{ name: 'Biodiversity' }, { name: 'Conservation Strategies' }] },
                { name: 'Environmental Issues', topics: [{ name: 'Pollution' }, { name: 'Global Warming' }, { name: 'Waste Management' }] },
            ]
        },
    ]
};

// All Curricula
export const CURRICULUM_DATA: ClassCurriculum[] = [
    class8Curriculum,
    class9Curriculum,
    class10Curriculum,
    class11Curriculum,
    class12Curriculum,
];

// Helper Functions
export const getCurriculumByClass = (classNum: number): ClassCurriculum | undefined => {
    return CURRICULUM_DATA.find(c => c.classNumber === classNum);
};

export const getSubjectsByClass = (classNum: number): string[] => {
    const curriculum = getCurriculumByClass(classNum);
    return curriculum ? curriculum.subjects.map(s => s.name) : [];
};

export const getChaptersBySubject = (classNum: number, subjectName: string): Chapter[] => {
    const curriculum = getCurriculumByClass(classNum);
    const subject = curriculum?.subjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase());
    return subject?.chapters || [];
};

export const getTopicsByChapter = (classNum: number, subjectName: string, chapterName: string): Topic[] => {
    const chapters = getChaptersBySubject(classNum, subjectName);
    const chapter = chapters.find(c => c.name.toLowerCase() === chapterName.toLowerCase());
    return chapter?.topics || [];
};

export const searchCurriculum = (query: string): Array<{ classNum: number; subject: string; chapter: string; topic: string }> => {
    const results: Array<{ classNum: number; subject: string; chapter: string; topic: string }> = [];
    const lowerQuery = query.toLowerCase();

    for (const curriculum of CURRICULUM_DATA) {
        for (const subject of curriculum.subjects) {
            for (const chapter of subject.chapters) {
                for (const topic of chapter.topics) {
                    if (
                        topic.name.toLowerCase().includes(lowerQuery) ||
                        chapter.name.toLowerCase().includes(lowerQuery) ||
                        subject.name.toLowerCase().includes(lowerQuery)
                    ) {
                        results.push({
                            classNum: curriculum.classNumber,
                            subject: subject.name,
                            chapter: chapter.name,
                            topic: topic.name,
                        });
                    }
                }
            }
        }
    }

    return results;
};

export const getAllClasses = (): number[] => CURRICULUM_DATA.map(c => c.classNumber);

export const getBoardByClass = (classNum: number): Board | undefined => {
    const curriculum = getCurriculumByClass(classNum);
    return curriculum?.board;
};
