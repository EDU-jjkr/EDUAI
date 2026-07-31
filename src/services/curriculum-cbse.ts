/**
 * CBSE Curriculum Data (Classes 8–12)
 * Based on official NCERT / CBSE syllabus 2024-2025
 */

// Inline type definitions to avoid circular dependency with curriculum.ts
export interface Topic { name: string; subtopics?: string[] }
export interface Chapter { name: string; topics: Topic[] }
export interface Subject { name: string; chapters: Chapter[] }
export type Board = 'ICSE' | 'ISC' | 'CBSE';
export interface ClassCurriculum { classNumber: number; board: Board; subjects: Subject[] }

// ─── Class 8 ───────────────────────────────────────────────────────────────
export const class8CurriculumCBSE: ClassCurriculum = {
    classNumber: 8,
    board: 'CBSE',
    subjects: [
        {
            name: 'Mathematics',
            chapters: [
                { name: 'Rational Numbers', topics: [{ name: 'Properties of Rational Numbers' }, { name: 'Representation on Number Line' }, { name: 'Operations on Rational Numbers' }] },
                { name: 'Linear Equations in One Variable', topics: [{ name: 'Solving Linear Equations' }, { name: 'Applications of Linear Equations' }, { name: 'Reducing Equations to Simpler Form' }] },
                { name: 'Understanding Quadrilaterals', topics: [{ name: 'Polygons' }, { name: 'Properties of Parallelograms' }, { name: 'Rhombus, Rectangle, Square' }] },
                { name: 'Practical Geometry', topics: [{ name: 'Constructing Quadrilaterals' }, { name: 'Special Cases of Construction' }] },
                { name: 'Data Handling', topics: [{ name: 'Organising Data' }, { name: 'Circle Graph or Pie Chart' }, { name: 'Chance and Probability' }] },
                { name: 'Squares and Square Roots', topics: [{ name: 'Properties of Square Numbers' }, { name: 'Finding Square Roots' }, { name: 'Square Roots of Decimals' }] },
                { name: 'Cubes and Cube Roots', topics: [{ name: 'Cubes and their Properties' }, { name: 'Cube Roots' }] },
                { name: 'Comparing Quantities', topics: [{ name: 'Ratios and Percentages' }, { name: 'Discount and Tax' }, { name: 'Compound Interest' }] },
                { name: 'Algebraic Expressions and Identities', topics: [{ name: 'Algebraic Expressions' }, { name: 'Multiplication of Algebraic Expressions' }, { name: 'Standard Identities' }] },
                { name: 'Visualising Solid Shapes', topics: [{ name: 'Views of 3D Shapes' }, { name: 'Mapping Space Around Us' }, { name: 'Faces, Edges and Vertices' }] },
                { name: 'Mensuration', topics: [{ name: 'Area of Trapezium' }, { name: 'Area of Polygon' }, { name: 'Surface Area and Volume' }] },
                { name: 'Exponents and Powers', topics: [{ name: 'Powers with Negative Exponents' }, { name: 'Laws of Exponents' }, { name: 'Standard Form' }] },
                { name: 'Direct and Inverse Proportions', topics: [{ name: 'Direct Proportion' }, { name: 'Inverse Proportion' }] },
                { name: 'Factorisation', topics: [{ name: 'Factors of Natural Numbers' }, { name: 'Division of Algebraic Expressions' }] },
                { name: 'Introduction to Graphs', topics: [{ name: 'Linear Graphs' }, { name: 'Some Applications of Graphs' }] },
                { name: 'Playing with Numbers', topics: [{ name: 'Numbers in General Form' }, { name: 'Games with Numbers' }, { name: 'Divisibility Tests' }] },
            ]
        },
        {
            name: 'Science',
            chapters: [
                { name: 'Crop Production and Management', topics: [{ name: 'Agricultural Practices' }, { name: 'Basic Practices of Crop Production' }, { name: 'Animal Husbandry' }] },
                { name: 'Microorganisms: Friend and Foe', topics: [{ name: 'Microorganisms and Us' }, { name: 'Harmful Microorganisms' }, { name: 'Food Preservation' }] },
                { name: 'Synthetic Fibres and Plastics', topics: [{ name: 'Synthetic Fibres' }, { name: 'Plastics' }, { name: 'Plastics and the Environment' }] },
                { name: 'Materials: Metals and Non-Metals', topics: [{ name: 'Physical Properties of Metals' }, { name: 'Chemical Properties of Metals' }, { name: 'Uses of Metals and Non-Metals' }] },
                { name: 'Coal and Petroleum', topics: [{ name: 'Natural Resources' }, { name: 'Coal' }, { name: 'Petroleum and Natural Gas' }] },
                { name: 'Combustion and Flame', topics: [{ name: 'What is Combustion?' }, { name: 'Types of Combustion' }, { name: 'Structure of a Flame' }] },
                { name: 'Conservation of Plants and Animals', topics: [{ name: 'Deforestation and its Causes' }, { name: 'Protected Areas' }, { name: 'Wildlife Sanctuaries and National Parks' }] },
                { name: 'Cell: Structure and Functions', topics: [{ name: 'Discovery of Cell' }, { name: 'Cell Structure' }, { name: 'Parts of Cell' }] },
                { name: 'Reproduction in Animals', topics: [{ name: 'Modes of Reproduction' }, { name: 'Sexual Reproduction' }, { name: 'Asexual Reproduction' }] },
                { name: 'Reaching the Age of Adolescence', topics: [{ name: 'Adolescence and Puberty' }, { name: 'Changes at Puberty' }, { name: 'Sex Determination' }] },
                { name: 'Force and Pressure', topics: [{ name: 'Force' }, { name: 'Pressure' }, { name: 'Pressure Exerted by Liquids and Gases' }] },
                { name: 'Friction', topics: [{ name: 'Force of Friction' }, { name: 'Factors Affecting Friction' }, { name: 'Increasing and Reducing Friction' }] },
                { name: 'Sound', topics: [{ name: 'Sound is Produced by Vibrating Bodies' }, { name: 'Propagation of Sound' }, { name: 'Human Ear' }] },
                { name: 'Chemical Effects of Electric Current', topics: [{ name: 'Do Liquids Conduct Electricity?' }, { name: 'Chemical Effects' }, { name: 'Electroplating' }] },
                { name: 'Some Natural Phenomena', topics: [{ name: 'Lightning' }, { name: 'Earthquakes' }] },
                { name: 'Light', topics: [{ name: 'Laws of Reflection' }, { name: 'Kaleidoscope' }, { name: 'Human Eye' }] },
                { name: 'Stars and the Solar System', topics: [{ name: 'Stars' }, { name: 'The Solar System' }, { name: 'Asteroids and Comets' }] },
                { name: 'Pollution of Air and Water', topics: [{ name: 'Air Pollution' }, { name: 'Water Pollution' }, { name: 'Potable Water' }] },
            ]
        },
        {
            name: 'Social Science',
            chapters: [
                { name: 'Resources', topics: [{ name: 'Types of Resources' }, { name: 'Utilisation of Resources' }, { name: 'Conservation of Resources' }] },
                { name: 'Land, Soil, Water, Natural Vegetation and Wildlife', topics: [{ name: 'Land' }, { name: 'Soil' }, { name: 'Water Resources' }] },
                { name: 'Mineral and Power Resources', topics: [{ name: 'Minerals' }, { name: 'Power Resources' }, { name: 'Conventional and Non-Conventional Sources' }] },
                { name: 'Agriculture', topics: [{ name: 'Types of Farming' }, { name: 'Major Crops' }, { name: 'Agricultural Development' }] },
                { name: 'Industries', topics: [{ name: 'Types of Industries' }, { name: 'Iron and Steel Industry' }, { name: 'IT Industry' }] },
                { name: 'How, When and Where', topics: [{ name: 'How Important is a Date?' }, { name: 'How Do We Periodise?' }, { name: 'What Colonial Rule Meant' }] },
                { name: 'From Trade to Territory', topics: [{ name: 'East India Company Comes East' }, { name: 'Company Power Expands' }, { name: 'The Army' }] },
                { name: 'Ruling the Countryside', topics: [{ name: 'The Company Becomes the Diwan' }, { name: 'Permanent Settlement' }, { name: 'The Munro System' }] },
                { name: 'The Indian Constitution', topics: [{ name: 'Why Does a Country Need a Constitution?' }, { name: 'The Indian Constitution' }, { name: 'Fundamental Rights' }] },
                { name: 'Parliament and the Making of Laws', topics: [{ name: 'The Role of Parliament' }, { name: 'Two Houses of Parliament' }, { name: 'What is a Vote of Thanks?' }] },
            ]
        },
        {
            name: 'English',
            chapters: [
                { name: 'Honeydew (Prose)', topics: [{ name: 'The Best Christmas Present in the World' }, { name: 'The Tsunami' }, { name: 'Glimpses of the Past' }, { name: 'Bepin Choudhury' }, { name: 'The Summit Within' }, { name: 'This is Jody\'s Fawn' }, { name: 'A Visit to Cambridge' }, { name: 'A Short Monsoon Diary' }] },
                { name: 'Honeydew (Poetry)', topics: [{ name: 'The Ant and the Cricket' }, { name: 'Geography Lesson' }, { name: 'Macavity: The Mystery Cat' }, { name: 'The Last Bargain' }, { name: 'The School Boy' }] },
                { name: 'It So Happened', topics: [{ name: 'How the Camel Got His Hump' }, { name: 'Children at Work' }, { name: 'The Selfish Giant' }, { name: 'The Treasure Within' }, { name: 'Princess September' }, { name: 'The Open Window' }, { name: 'Jalebis' }] },
                { name: 'Writing Skills', topics: [{ name: 'Letter Writing' }, { name: 'Notice Writing' }, { name: 'Paragraph Writing' }, { name: 'Essay Writing' }] },
                { name: 'Grammar', topics: [{ name: 'Tenses' }, { name: 'Active and Passive Voice' }, { name: 'Direct and Indirect Speech' }, { name: 'Determiners' }, { name: 'Prepositions' }] },
            ]
        },
        {
            name: 'Hindi',
            chapters: [
                { name: 'Vasant (Gadya)', topics: [{ name: 'Dhvani' }, { name: 'Lakh ki Chudiyan' }, { name: 'Bus ki Yatra' }, { name: 'Divano ki Hasti' }, { name: 'Chitthiyon ki Anuthi Duniya' }] },
                { name: 'Vasant (Padya)', topics: [{ name: 'Jab Cinema ne Bolna Seekha' }, { name: 'Surdas ke Pad' }, { name: 'Yahan Pahiya Hai' }] },
                { name: 'Doorva', topics: [{ name: 'Gudiya' }, { name: 'Do Gauraiya' }, { name: 'Chitthi ka Safar' }, { name: 'Os' }] },
                { name: 'Vyakaran', topics: [{ name: 'Shabd-Bhed' }, { name: 'Kriya aur Kriya-Visheshan' }, { name: 'Vakya-Bhed' }, { name: 'Samas' }] },
            ]
        },
    ]
}

// ─── Class 9 ───────────────────────────────────────────────────────────────
export const class9CurriculumCBSE: ClassCurriculum = {
    classNumber: 9,
    board: 'CBSE',
    subjects: [
        {
            name: 'Mathematics',
            chapters: [
                { name: 'Number Systems', topics: [{ name: 'Irrational Numbers' }, { name: 'Real Numbers and their Decimal Expansions' }, { name: 'Operations on Real Numbers' }, { name: 'Laws of Exponents for Real Numbers' }] },
                { name: 'Polynomials', topics: [{ name: 'Polynomials in One Variable' }, { name: 'Zeroes of a Polynomial' }, { name: 'Remainder Theorem' }, { name: 'Factor Theorem' }, { name: 'Algebraic Identities' }] },
                { name: 'Coordinate Geometry', topics: [{ name: 'Cartesian System' }, { name: 'Plotting a Point in the Plane' }] },
                { name: 'Linear Equations in Two Variables', topics: [{ name: 'Linear Equations' }, { name: 'Solution of a Linear Equation' }, { name: 'Graph of a Linear Equation' }] },
                { name: 'Lines and Angles', topics: [{ name: 'Basic Terms and Definitions' }, { name: 'Intersecting Lines' }, { name: 'Parallel Lines and a Transversal' }] },
                { name: 'Triangles', topics: [{ name: 'Congruence of Triangles' }, { name: 'Criteria for Congruence' }, { name: 'Properties of a Triangle' }, { name: 'Inequalities in a Triangle' }] },
                { name: 'Quadrilaterals', topics: [{ name: 'Angle Sum Property' }, { name: 'Types of Quadrilaterals' }, { name: 'Properties of a Parallelogram' }, { name: 'Mid-Point Theorem' }] },
                { name: 'Circles', topics: [{ name: 'Circles and Related Terms' }, { name: 'Angle Subtended by a Chord' }, { name: 'Equal Chords' }, { name: 'Cyclic Quadrilaterals' }] },
                { name: 'Constructions', topics: [{ name: 'Basic Constructions' }, { name: 'Some Constructions of Triangles' }] },
                { name: "Heron's Formula", topics: [{ name: "Area by Heron's Formula" }, { name: "Application of Heron's Formula" }] },
                { name: 'Surface Areas and Volumes', topics: [{ name: 'Surface Area of Cuboid and Cube' }, { name: 'Surface Area of Cylinder, Cone, Sphere' }, { name: 'Volume of Cuboid, Cylinder, Cone, Sphere' }] },
                { name: 'Statistics', topics: [{ name: 'Collection of Data' }, { name: 'Presentation of Data' }, { name: 'Graphical Representation' }, { name: 'Measures of Central Tendency' }] },
                { name: 'Probability', topics: [{ name: 'Probability: An Experimental Approach' }] },
            ]
        },
        {
            name: 'Science',
            chapters: [
                { name: 'Matter in Our Surroundings', topics: [{ name: 'Physical Nature of Matter' }, { name: 'Characteristics of Particles of Matter' }, { name: 'States of Matter' }] },
                { name: 'Is Matter Around Us Pure', topics: [{ name: 'Mixtures' }, { name: 'Solutions' }, { name: 'Separating Mixtures' }, { name: 'Physical and Chemical Changes' }] },
                { name: 'Atoms and Molecules', topics: [{ name: 'Laws of Chemical Combination' }, { name: 'Atoms' }, { name: 'Molecules' }, { name: 'Mole Concept' }] },
                { name: 'Structure of the Atom', topics: [{ name: 'Thomson Model' }, { name: 'Rutherford Model' }, { name: 'Bohr Model' }, { name: 'Valency and Atomic Number' }] },
                { name: 'The Fundamental Unit of Life', topics: [{ name: 'What is a Cell?' }, { name: 'Plasma Membrane' }, { name: 'Nucleus' }, { name: 'Cell Organelles' }] },
                { name: 'Tissues', topics: [{ name: 'Plant Tissues' }, { name: 'Animal Tissues' }] },
                { name: 'Diversity in Living Organisms', topics: [{ name: 'Basis of Classification' }, { name: 'Classification and Evolution' }, { name: 'Hierarchy of Classification' }] },
                { name: 'Motion', topics: [{ name: 'Describing Motion' }, { name: 'Rate of Motion' }, { name: 'Rate of Change of Velocity' }, { name: 'Graphical Representation' }, { name: 'Equations of Motion' }] },
                { name: 'Force and Laws of Motion', topics: [{ name: 'Balanced and Unbalanced Forces' }, { name: "Newton's Laws of Motion" }, { name: 'Conservation of Momentum' }] },
                { name: 'Gravitation', topics: [{ name: 'Gravitation' }, { name: 'Free Fall' }, { name: 'Mass and Weight' }, { name: "Archimedes' Principle" }] },
                { name: 'Work and Energy', topics: [{ name: 'Work' }, { name: 'Energy' }, { name: 'Power' }, { name: 'Commercial Unit of Energy' }] },
                { name: 'Sound', topics: [{ name: 'Production of Sound' }, { name: 'Propagation of Sound' }, { name: 'Reflection of Sound' }, { name: 'Applications of Ultrasound' }] },
                { name: 'Why Do We Fall Ill', topics: [{ name: 'Health and its Failure' }, { name: 'Disease and its Causes' }, { name: 'Infectious Diseases' }] },
                { name: 'Natural Resources', topics: [{ name: 'Air' }, { name: 'Water' }, { name: 'Soil' }, { name: 'Biogeochemical Cycles' }] },
                { name: 'Improvement in Food Resources', topics: [{ name: 'Improvement in Crop Yields' }, { name: 'Animal Husbandry' }] },
            ]
        },
        {
            name: 'Social Science',
            chapters: [
                { name: 'India: Size and Location', topics: [{ name: 'Location' }, { name: 'Size' }, { name: 'India and the World' }] },
                { name: 'Physical Features of India', topics: [{ name: 'The Himalayan Mountains' }, { name: 'The Northern Plains' }, { name: 'The Peninsular Plateau' }, { name: 'The Coastal Plains' }] },
                { name: 'Drainage', topics: [{ name: 'The Himalayan Rivers' }, { name: 'The Peninsular Rivers' }, { name: 'Lakes' }] },
                { name: 'Climate', topics: [{ name: 'Factors Affecting Climate' }, { name: 'The Indian Monsoon' }, { name: 'Distribution of Rainfall' }] },
                { name: 'Natural Vegetation and Wildlife', topics: [{ name: 'Types of Vegetation' }, { name: 'Wildlife' }, { name: 'Conservation' }] },
                { name: 'The French Revolution', topics: [{ name: 'French Society in the 18th Century' }, { name: 'Outbreak of the Revolution' }, { name: 'France Abolishes Monarchy' }, { name: 'Legacy of the Revolution' }] },
                { name: 'Socialism in Europe and the Russian Revolution', topics: [{ name: 'The Age of Social Change' }, { name: 'The Russian Revolution' }, { name: 'What Changed after October?' }] },
                { name: 'Nazism and the Rise of Hitler', topics: [{ name: 'Birth of the Weimar Republic' }, { name: "Hitler's Rise to Power" }, { name: 'The Nazi Worldview' }] },
                { name: 'Electoral Politics', topics: [{ name: 'Why Elections?' }, { name: 'Electoral System' }, { name: 'Code of Conduct' }] },
                { name: 'Working of Institutions', topics: [{ name: 'Parliament' }, { name: 'Political Executive' }, { name: 'The Judiciary' }] },
                { name: 'Poverty as a Challenge', topics: [{ name: 'Poverty Line' }, { name: 'Causes of Poverty' }, { name: 'Anti-Poverty Measures' }] },
            ]
        },
        {
            name: 'English',
            chapters: [
                { name: 'Beehive (Prose)', topics: [{ name: 'The Fun They Had' }, { name: 'The Sound of Music' }, { name: 'The Little Girl' }, { name: 'A Truly Beautiful Mind' }, { name: 'The Snake and the Mirror' }, { name: 'My Childhood' }, { name: 'Reach for the Top' }] },
                { name: 'Beehive (Poetry)', topics: [{ name: 'The Road Not Taken' }, { name: 'Wind' }, { name: 'Rain on the Roof' }, { name: 'The Lake Isle of Innisfree' }, { name: 'A Legend of the Northland' }, { name: 'No Men Are Foreign' }] },
                { name: 'Moments (Supplementary)', topics: [{ name: 'The Lost Child' }, { name: 'The Adventures of Toto' }, { name: 'Iswaran the Storyteller' }, { name: 'In the Kingdom of Fools' }, { name: 'The Happy Prince' }, { name: 'The Last Leaf' }] },
                { name: 'Writing Skills', topics: [{ name: 'Descriptive Writing' }, { name: 'Story Writing' }, { name: 'Diary Entry' }, { name: 'Formal and Informal Letters' }] },
                { name: 'Grammar', topics: [{ name: 'Tenses' }, { name: 'Modals' }, { name: 'Active and Passive Voice' }, { name: 'Reported Speech' }, { name: 'Clauses' }] },
            ]
        },
        {
            name: 'Hindi',
            chapters: [
                { name: 'Kshitij (Gadya)', topics: [{ name: 'Do Bailon ki Katha' }, { name: 'Lhasa ki Or' }, { name: 'Upbhokta Sanskriti' }, { name: 'Naana Sahab ki Putri' }] },
                { name: 'Kshitij (Kavya)', topics: [{ name: 'Kabir ki Sakhiyan' }, { name: 'Vakh' }, { name: 'Savaiye' }, { name: 'Kaidi aur Kokila' }] },
                { name: 'Kritika', topics: [{ name: 'Is Jal Pralay Mein' }, { name: 'Mere Sang ki Aurten' }, { name: 'Reedh ki Haddi' }] },
                { name: 'Vyakaran', topics: [{ name: 'Shabd-Vichar' }, { name: 'Sandhi aur Samas' }, { name: 'Vakya-Rachna' }, { name: 'Alankar' }] },
            ]
        },
    ]
}

// ─── Class 10 ──────────────────────────────────────────────────────────────
export const class10CurriculumCBSE: ClassCurriculum = {
    classNumber: 10,
    board: 'CBSE',
    subjects: [
        {
            name: 'Mathematics',
            chapters: [
                { name: 'Real Numbers', topics: [{ name: "Euclid's Division Lemma" }, { name: 'Fundamental Theorem of Arithmetic' }, { name: 'Revisiting Irrational Numbers' }, { name: 'Rational Numbers and Decimal Expansions' }] },
                { name: 'Polynomials', topics: [{ name: 'Geometrical Meaning of Zeroes' }, { name: 'Relationship between Zeroes and Coefficients' }, { name: 'Division Algorithm for Polynomials' }] },
                { name: 'Pair of Linear Equations in Two Variables', topics: [{ name: 'Graphical Method of Solution' }, { name: 'Algebraic Methods' }, { name: 'Equations Reducible to Linear Equations' }] },
                { name: 'Quadratic Equations', topics: [{ name: 'Solution by Factorisation' }, { name: 'Solution by Completing the Square' }, { name: 'Nature of Roots' }] },
                { name: 'Arithmetic Progressions', topics: [{ name: 'Arithmetic Progressions' }, { name: 'nth Term of an AP' }, { name: 'Sum of First n Terms of an AP' }] },
                { name: 'Triangles', topics: [{ name: 'Basic Proportionality Theorem' }, { name: 'Criteria for Similarity' }, { name: 'Areas of Similar Triangles' }, { name: 'Pythagoras Theorem' }] },
                { name: 'Coordinate Geometry', topics: [{ name: 'Distance Formula' }, { name: 'Section Formula' }, { name: 'Area of a Triangle' }] },
                { name: 'Introduction to Trigonometry', topics: [{ name: 'Trigonometric Ratios' }, { name: 'Trigonometric Ratios of Specific Angles' }, { name: 'Trigonometric Identities' }] },
                { name: 'Some Applications of Trigonometry', topics: [{ name: 'Heights and Distances' }] },
                { name: 'Circles', topics: [{ name: 'Tangent to a Circle' }, { name: 'Number of Tangents from a Point' }] },
                { name: 'Areas Related to Circles', topics: [{ name: 'Perimeter and Area of a Circle' }, { name: 'Areas of Sectors and Segments' }, { name: 'Areas of Combinations of Plane Figures' }] },
                { name: 'Surface Areas and Volumes', topics: [{ name: 'Surface Area of Combinations of Solids' }, { name: 'Volume of Combination of Solids' }, { name: 'Conversion of Solid Shape to Another' }] },
                { name: 'Statistics', topics: [{ name: 'Mean of Grouped Data' }, { name: 'Mode of Grouped Data' }, { name: 'Median of Grouped Data' }, { name: 'Cumulative Frequency Distribution' }] },
                { name: 'Probability', topics: [{ name: 'Classical Theory of Probability' }] },
            ]
        },
        {
            name: 'Science',
            chapters: [
                { name: 'Chemical Reactions and Equations', topics: [{ name: 'Chemical Equations' }, { name: 'Types of Chemical Reactions' }, { name: 'Oxidation Reactions' }] },
                { name: 'Acids, Bases and Salts', topics: [{ name: 'Chemical Properties of Acids and Bases' }, { name: 'pH Scale' }, { name: 'Salts' }] },
                { name: 'Metals and Non-metals', topics: [{ name: 'Physical Properties' }, { name: 'Chemical Properties of Metals' }, { name: 'Reactivity Series' }, { name: 'Corrosion' }] },
                { name: 'Carbon and its Compounds', topics: [{ name: 'Bonding in Carbon' }, { name: 'Versatile Nature of Carbon' }, { name: 'Homologous Series' }, { name: 'Chemical Properties' }] },
                { name: 'Periodic Classification of Elements', topics: [{ name: "Mendeleev's Periodic Table" }, { name: 'Modern Periodic Table' }, { name: 'Trends in the Modern Periodic Table' }] },
                { name: 'Life Processes', topics: [{ name: 'Nutrition' }, { name: 'Respiration' }, { name: 'Transportation' }, { name: 'Excretion' }] },
                { name: 'Control and Coordination', topics: [{ name: 'Nervous System' }, { name: 'Coordination in Plants' }, { name: 'Hormones in Animals' }] },
                { name: 'How Do Organisms Reproduce?', topics: [{ name: 'Modes of Reproduction' }, { name: 'Sexual Reproduction in Flowering Plants' }, { name: 'Reproduction in Human Beings' }] },
                { name: 'Heredity and Evolution', topics: [{ name: 'Accumulation of Variation during Reproduction' }, { name: 'Heredity' }, { name: 'Evolution' }, { name: 'Speciation' }] },
                { name: 'Light: Reflection and Refraction', topics: [{ name: 'Reflection of Light' }, { name: 'Spherical Mirrors' }, { name: 'Refraction of Light' }, { name: 'Refraction by Spherical Lenses' }] },
                { name: 'The Human Eye and the Colourful World', topics: [{ name: 'The Human Eye' }, { name: 'Defects of Vision and Correction' }, { name: 'Refraction through a Prism' }, { name: 'Atmospheric Refraction' }] },
                { name: 'Electricity', topics: [{ name: 'Electric Current and Circuit' }, { name: 'Electric Potential' }, { name: "Ohm's Law" }, { name: 'Resistance in Series and Parallel' }, { name: 'Heating Effect of Electric Current' }] },
                { name: 'Magnetic Effects of Electric Current', topics: [{ name: 'Magnetic Field and Field Lines' }, { name: 'Magnetic Field due to Current' }, { name: 'Force on a Current-Carrying Conductor' }, { name: 'Electric Motor' }, { name: 'Electromagnetic Induction' }] },
                { name: 'Sources of Energy', topics: [{ name: 'Conventional Sources of Energy' }, { name: 'Alternative Sources' }, { name: 'Environmental Consequences' }] },
                { name: 'Our Environment', topics: [{ name: 'Ecosystem Components' }, { name: 'Food Chains and Webs' }, { name: 'How Our Activities Affect the Environment' }] },
                { name: 'Management of Natural Resources', topics: [{ name: 'Forests and Wildlife' }, { name: 'Water for All' }, { name: 'Coal and Petroleum' }] },
            ]
        },
        {
            name: 'Social Science',
            chapters: [
                { name: 'The Rise of Nationalism in Europe', topics: [{ name: 'The French Revolution and the Nation' }, { name: 'Making of Nationalism in Europe' }, { name: 'The Age of Revolutions' }, { name: 'The Making of Germany and Italy' }] },
                { name: 'Nationalism in India', topics: [{ name: 'The First World War and Non-Cooperation' }, { name: 'Differing Strands within the Movement' }, { name: 'Towards Civil Disobedience' }, { name: 'The Sense of Collective Belonging' }] },
                { name: 'The Making of a Global World', topics: [{ name: 'The Pre-modern World' }, { name: 'The Nineteenth Century' }, { name: 'The Inter-war Economy' }, { name: 'Rebuilding a World Economy' }] },
                { name: 'Resources and Development', topics: [{ name: 'Types of Resources' }, { name: 'Development of Resources' }, { name: 'Resource Planning in India' }, { name: 'Land Resources' }] },
                { name: 'Water Resources', topics: [{ name: 'Water Scarcity' }, { name: 'Multi-Purpose River Projects' }, { name: 'Rainwater Harvesting' }] },
                { name: 'Agriculture', topics: [{ name: 'Types of Farming' }, { name: 'Cropping Pattern' }, { name: 'Major Crops' }, { name: 'Agricultural Reforms' }] },
                { name: 'Power Sharing', topics: [{ name: 'Belgium and Sri Lanka' }, { name: 'Why Power Sharing is Desirable?' }, { name: 'Forms of Power Sharing' }] },
                { name: 'Federalism', topics: [{ name: 'What is Federalism?' }, { name: 'What Makes India a Federal Country?' }, { name: 'Decentralisation in India' }] },
                { name: 'Gender, Religion and Caste', topics: [{ name: 'Gender and Politics' }, { name: 'Religion, Communalism and Politics' }, { name: 'Caste and Politics' }] },
                { name: 'Development', topics: [{ name: 'What Development Promises?' }, { name: 'Income and Other Goals' }, { name: 'National Development' }, { name: 'Public Facilities' }] },
                { name: 'Sectors of the Indian Economy', topics: [{ name: 'Sectors of Economic Activities' }, { name: 'Comparing the Three Sectors' }, { name: 'Division into Organised and Unorganised' }] },
            ]
        },
        {
            name: 'English',
            chapters: [
                { name: 'First Flight (Prose)', topics: [{ name: 'A Letter to God' }, { name: 'Nelson Mandela: Long Walk to Freedom' }, { name: 'Two Stories about Flying' }, { name: 'From the Diary of Anne Frank' }, { name: 'The Hundred Dresses (I & II)' }, { name: 'Glimpses of India' }, { name: 'Mijbil the Otter' }, { name: 'Madam Rides the Bus' }, { name: 'The Sermon at Benares' }, { name: 'The Proposal' }] },
                { name: 'First Flight (Poetry)', topics: [{ name: 'Dust of Snow' }, { name: 'Fire and Ice' }, { name: 'A Tiger in the Zoo' }, { name: 'How to Tell Wild Animals' }, { name: 'The Ball Poem' }, { name: 'Amanda!' }, { name: 'The Trees' }, { name: 'Fog' }] },
                { name: 'Footprints without Feet', topics: [{ name: 'A Triumph of Surgery' }, { name: "The Thief's Story" }, { name: 'The Midnight Visitor' }, { name: 'A Question of Trust' }, { name: 'Footprints without Feet' }, { name: 'The Necklace' }, { name: 'The Hack Driver' }, { name: 'Bholi' }] },
                { name: 'Writing Skills', topics: [{ name: 'Formal Letter Writing' }, { name: 'Report Writing' }, { name: 'Paragraph Writing' }, { name: 'Notice and Message Writing' }] },
                { name: 'Grammar', topics: [{ name: 'Determiners' }, { name: 'Subject-Verb Agreement' }, { name: 'Tenses' }, { name: 'Reported Speech' }, { name: 'Active and Passive Voice' }] },
            ]
        },
        {
            name: 'Hindi',
            chapters: [
                { name: 'Kshitij (Gadya)', topics: [{ name: 'Surdas ke Pad' }, { name: 'Ram-Lakshman-Parashuram Samvad' }, { name: 'Dev ke Savaiye' }, { name: 'Atmakathya' }] },
                { name: 'Kshitij (Kavya)', topics: [{ name: 'Netaji ka Chashma' }, { name: 'Balgobhin Bhagat' }, { name: 'Lakhnavee Andaaz' }, { name: 'Manviya Karuna ki Divya Chamak' }] },
                { name: 'Kritika', topics: [{ name: 'Mata ka Aanchal' }, { name: 'George Pancham ki Naak' }, { name: 'Sana-Sana Hath Jodi' }] },
                { name: 'Vyakaran', topics: [{ name: 'Samas' }, { name: 'Muhavare aur Lokoktiyan' }, { name: 'Apathit Gadyansh' }, { name: 'Patra-Lekhan' }] },
            ]
        },
    ]
}

// ─── Class 11 ──────────────────────────────────────────────────────────────
export const class11CurriculumCBSE: ClassCurriculum = {
    classNumber: 11,
    board: 'CBSE',
    subjects: [
        {
            name: 'Physics',
            chapters: [
                { name: 'Physical World', topics: [{ name: 'Physics: Scope and Excitement' }, { name: 'Nature of Physical Laws' }] },
                { name: 'Units and Measurements', topics: [{ name: 'International System of Units' }, { name: 'Measurement of Length, Mass, Time' }, { name: 'Accuracy and Precision' }, { name: 'Dimensional Analysis' }] },
                { name: 'Motion in a Straight Line', topics: [{ name: 'Position, Path Length and Displacement' }, { name: 'Average Velocity and Speed' }, { name: 'Acceleration' }, { name: 'Kinematic Equations' }] },
                { name: 'Motion in a Plane', topics: [{ name: 'Scalars and Vectors' }, { name: 'Projectile Motion' }, { name: 'Uniform Circular Motion' }] },
                { name: 'Laws of Motion', topics: [{ name: "Newton's First, Second and Third Laws" }, { name: 'Conservation of Momentum' }, { name: 'Friction' }] },
                { name: 'Work, Energy and Power', topics: [{ name: 'Work' }, { name: 'Kinetic Energy' }, { name: 'Work-Energy Theorem' }, { name: 'Potential Energy' }, { name: 'Conservation of Mechanical Energy' }, { name: 'Power' }] },
                { name: 'System of Particles and Rotational Motion', topics: [{ name: 'Centre of Mass' }, { name: 'Torque' }, { name: 'Angular Momentum' }, { name: 'Moment of Inertia' }, { name: 'Rolling Motion' }] },
                { name: 'Gravitation', topics: [{ name: "Kepler's Laws" }, { name: 'Universal Law of Gravitation' }, { name: 'Gravitational Potential Energy' }, { name: 'Escape Speed' }, { name: 'Satellites' }] },
                { name: 'Mechanical Properties of Solids', topics: [{ name: 'Elastic Behaviour of Solids' }, { name: 'Stress and Strain' }, { name: "Hooke's Law" }, { name: 'Moduli of Elasticity' }] },
                { name: 'Mechanical Properties of Fluids', topics: [{ name: 'Pressure' }, { name: "Bernoulli's Principle" }, { name: 'Surface Tension' }, { name: 'Viscosity' }] },
                { name: 'Thermal Properties of Matter', topics: [{ name: 'Temperature and Heat' }, { name: 'Thermal Expansion' }, { name: 'Specific Heat Capacity' }, { name: 'Change of State' }] },
                { name: 'Thermodynamics', topics: [{ name: 'Thermal Equilibrium' }, { name: 'First Law of Thermodynamics' }, { name: 'Second Law of Thermodynamics' }, { name: 'Reversible and Irreversible Processes' }] },
                { name: 'Kinetic Theory', topics: [{ name: 'Molecular Nature of Matter' }, { name: 'Behaviour of Gases' }, { name: 'Kinetic Theory of an Ideal Gas' }] },
                { name: 'Oscillations', topics: [{ name: 'Periodic and Oscillatory Motions' }, { name: 'Simple Harmonic Motion' }, { name: 'Simple Pendulum' }, { name: 'Damped SHM' }] },
                { name: 'Waves', topics: [{ name: 'Transverse and Longitudinal Waves' }, { name: 'Speed of a Travelling Wave' }, { name: 'Superposition Principle' }, { name: 'Doppler Effect' }] },
            ]
        },
        {
            name: 'Chemistry',
            chapters: [
                { name: 'Some Basic Concepts of Chemistry', topics: [{ name: 'Nature of Matter' }, { name: 'Properties of Matter' }, { name: 'Laws of Chemical Combination' }, { name: "Dalton's Atomic Theory" }, { name: 'Mole Concept' }] },
                { name: 'Structure of Atom', topics: [{ name: 'Discovery of Electron, Proton, Neutron' }, { name: 'Atomic Models' }, { name: 'Quantum Numbers' }, { name: 'Aufbau Principle' }, { name: 'Electronic Configuration' }] },
                { name: 'Classification of Elements and Periodicity', topics: [{ name: 'Genesis of Periodic Classification' }, { name: 'Modern Periodic Law' }, { name: 'Periodic Trends in Properties' }] },
                { name: 'Chemical Bonding and Molecular Structure', topics: [{ name: 'Ionic Bond' }, { name: 'Covalent Bond' }, { name: 'VSEPR Theory' }, { name: 'Hybridisation' }, { name: 'Hydrogen Bond' }] },
                { name: 'States of Matter', topics: [{ name: 'Intermolecular Forces' }, { name: 'Gas Laws' }, { name: 'Ideal Gas Equation' }, { name: 'Kinetic Theory of Gases' }] },
                { name: 'Thermodynamics', topics: [{ name: 'Thermodynamic Terms' }, { name: 'Enthalpy' }, { name: 'Gibbs Energy' }, { name: 'Entropy' }] },
                { name: 'Equilibrium', topics: [{ name: 'Equilibrium in Physical Processes' }, { name: 'Law of Chemical Equilibrium' }, { name: "Le Chatelier's Principle" }, { name: 'Ionic Equilibrium' }, { name: 'Acids, Bases and Salts' }] },
                { name: 'Redox Reactions', topics: [{ name: 'Classical Concept of Redox Reactions' }, { name: 'Oxidation Number' }, { name: 'Balancing Redox Reactions' }] },
                { name: 'Hydrogen', topics: [{ name: 'Position of Hydrogen' }, { name: 'Dihydrogen' }, { name: 'Water' }, { name: 'Hydrogen Peroxide' }] },
                { name: 's-Block Elements', topics: [{ name: 'Group 1 Elements: Alkali Metals' }, { name: 'Group 2 Elements: Alkaline Earth Metals' }] },
                { name: 'p-Block Elements (Groups 13 and 14)', topics: [{ name: 'Group 13: The Boron Family' }, { name: 'Group 14: The Carbon Family' }, { name: 'Allotropes of Carbon' }] },
                { name: 'Organic Chemistry: Basic Principles', topics: [{ name: 'General Introduction' }, { name: 'Methods of Purification' }, { name: 'Classification and IUPAC Nomenclature' }, { name: 'Isomerism' }] },
                { name: 'Hydrocarbons', topics: [{ name: 'Alkanes' }, { name: 'Alkenes' }, { name: 'Alkynes' }, { name: 'Aromatic Hydrocarbons' }] },
                { name: 'Environmental Chemistry', topics: [{ name: 'Environmental Pollution' }, { name: 'Atmospheric Pollution' }, { name: 'Water Pollution' }, { name: 'Soil Pollution' }] },
            ]
        },
        {
            name: 'Mathematics',
            chapters: [
                { name: 'Sets', topics: [{ name: 'Sets and their Representations' }, { name: 'Types of Sets' }, { name: 'Operations on Sets' }, { name: 'Venn Diagrams' }] },
                { name: 'Relations and Functions', topics: [{ name: 'Ordered Pairs and Cartesian Product' }, { name: 'Relations' }, { name: 'Functions' }, { name: 'Real Valued Functions' }] },
                { name: 'Trigonometric Functions', topics: [{ name: 'Angles' }, { name: 'Trigonometric Functions' }, { name: 'Trigonometric Functions of Sum and Difference' }, { name: 'Trigonometric Equations' }] },
                { name: 'Principle of Mathematical Induction', topics: [{ name: 'The Principle of Mathematical Induction' }, { name: 'Applications' }] },
                { name: 'Complex Numbers and Quadratic Equations', topics: [{ name: 'Complex Numbers' }, { name: 'Algebra of Complex Numbers' }, { name: 'Argand Plane' }, { name: 'Quadratic Equations' }] },
                { name: 'Linear Inequalities', topics: [{ name: 'Inequalities' }, { name: 'Algebraic Solutions' }, { name: 'Graphical Solution' }] },
                { name: 'Permutations and Combinations', topics: [{ name: 'Fundamental Principle of Counting' }, { name: 'Permutations' }, { name: 'Combinations' }] },
                { name: 'Binomial Theorem', topics: [{ name: 'Binomial Theorem for Positive Integral Indices' }, { name: 'General and Middle Term' }] },
                { name: 'Sequences and Series', topics: [{ name: 'Sequences and Series' }, { name: 'Arithmetic Progression (AP)' }, { name: 'Geometric Progression (GP)' }, { name: 'Sum of Special Series' }] },
                { name: 'Straight Lines', topics: [{ name: 'Slope of a Line' }, { name: 'Various Forms of the Equation of a Line' }, { name: 'Distance of a Point from a Line' }] },
                { name: 'Conic Sections', topics: [{ name: 'Circle' }, { name: 'Parabola' }, { name: 'Ellipse' }, { name: 'Hyperbola' }] },
                { name: 'Introduction to Three Dimensional Geometry', topics: [{ name: 'Coordinate Axes and Planes' }, { name: 'Coordinates of a Point in Space' }, { name: 'Distance between Two Points' }] },
                { name: 'Limits and Derivatives', topics: [{ name: 'Limits' }, { name: 'Limits of Trigonometric Functions' }, { name: 'Derivatives' }] },
                { name: 'Mathematical Reasoning', topics: [{ name: 'Statements' }, { name: 'New Statements from Old' }, { name: 'Validating Statements' }] },
                { name: 'Statistics', topics: [{ name: 'Measures of Dispersion' }, { name: 'Mean Deviation' }, { name: 'Variance and Standard Deviation' }] },
                { name: 'Probability', topics: [{ name: 'Random Experiments' }, { name: 'Events' }, { name: 'Axiomatic Approach to Probability' }] },
            ]
        },
        {
            name: 'Biology',
            chapters: [
                { name: 'The Living World', topics: [{ name: 'What is Living?' }, { name: 'Diversity in the Living World' }, { name: 'Taxonomic Categories' }, { name: 'Taxonomical Aids' }] },
                { name: 'Biological Classification', topics: [{ name: 'Kingdom Monera' }, { name: 'Kingdom Protista' }, { name: 'Kingdom Fungi' }, { name: 'Kingdom Plantae and Animalia' }, { name: 'Viruses and Lichens' }] },
                { name: 'Plant Kingdom', topics: [{ name: 'Algae' }, { name: 'Bryophytes' }, { name: 'Pteridophytes' }, { name: 'Gymnosperms' }, { name: 'Angiosperms' }] },
                { name: 'Animal Kingdom', topics: [{ name: 'Basis of Classification' }, { name: 'Classification of Animals' }] },
                { name: 'Morphology of Flowering Plants', topics: [{ name: 'Root, Stem, Leaf' }, { name: 'Flower, Fruit, Seed' }] },
                { name: 'Anatomy of Flowering Plants', topics: [{ name: 'Tissues' }, { name: 'Tissue System' }, { name: 'Secondary Growth' }] },
                { name: 'Structural Organisation in Animals', topics: [{ name: 'Animal Tissues' }, { name: 'Organ and Organ System' }] },
                { name: 'Cell: The Unit of Life', topics: [{ name: 'Cell Theory' }, { name: 'Prokaryotic Cells' }, { name: 'Eukaryotic Cells' }] },
                { name: 'Biomolecules', topics: [{ name: 'Carbohydrates' }, { name: 'Proteins' }, { name: 'Lipids' }, { name: 'Nucleic Acids' }, { name: 'Enzymes' }] },
                { name: 'Cell Cycle and Cell Division', topics: [{ name: 'Cell Cycle' }, { name: 'Mitosis' }, { name: 'Meiosis' }] },
                { name: 'Transport in Plants', topics: [{ name: 'Plant-Water Relations' }, { name: 'Long Distance Transport of Water' }, { name: 'Transpiration' }, { name: 'Phloem Transport' }] },
                { name: 'Mineral Nutrition', topics: [{ name: 'Macro and Micronutrients' }, { name: 'Nitrogen Metabolism' }] },
                { name: 'Photosynthesis in Higher Plants', topics: [{ name: 'Site of Photosynthesis' }, { name: 'Light Reactions' }, { name: 'Calvin Cycle' }, { name: 'Photorespiration' }] },
                { name: 'Respiration in Plants', topics: [{ name: 'Glycolysis' }, { name: 'Fermentation' }, { name: 'Aerobic Respiration' }, { name: 'Energy Calculations' }] },
                { name: 'Plant Growth and Development', topics: [{ name: 'Plant Growth' }, { name: 'Plant Growth Regulators' }, { name: 'Photoperiodism' }] },
                { name: 'Digestion and Absorption', topics: [{ name: 'Digestive System' }, { name: 'Digestion of Food' }, { name: 'Absorption' }, { name: 'Disorders of Digestive System' }] },
                { name: 'Breathing and Exchange of Gases', topics: [{ name: 'Respiratory Organs' }, { name: 'Mechanism of Breathing' }, { name: 'Exchange of Gases' }, { name: 'Transport of Gases' }] },
                { name: 'Body Fluids and Circulation', topics: [{ name: 'Blood' }, { name: 'Lymph' }, { name: 'Human Circulatory System' }, { name: 'Cardiac Cycle' }] },
                { name: 'Excretory Products and their Elimination', topics: [{ name: 'Human Excretory System' }, { name: 'Urine Formation' }, { name: 'Function of the Tubules' }] },
                { name: 'Locomotion and Movement', topics: [{ name: 'Types of Movement' }, { name: 'Muscle' }, { name: 'Skeletal System' }] },
                { name: 'Neural Control and Coordination', topics: [{ name: 'Neuron and Nerves' }, { name: 'Human Neural System' }, { name: 'Transmission of Nerve Impulse' }, { name: 'Reflex Action' }] },
                { name: 'Chemical Coordination and Integration', topics: [{ name: 'Endocrine Glands' }, { name: 'Human Endocrine System' }, { name: 'Mechanism of Hormone Action' }] },
            ]
        },
        {
            name: 'English',
            chapters: [
                { name: 'Hornbill (Prose)', topics: [{ name: 'The Portrait of a Lady' }, { name: "We're Not Afraid to Die" }, { name: 'Discovering Tut' }, { name: 'Landscape of the Soul' }, { name: 'The Ailing Planet' }, { name: 'The Browning Version' }, { name: 'The Adventure' }, { name: 'Silk Road' }] },
                { name: 'Hornbill (Poetry)', topics: [{ name: 'A Photograph' }, { name: 'The Laburnum Top' }, { name: 'The Voice of the Rain' }, { name: 'Childhood' }, { name: 'Father to Son' }] },
                { name: 'Snapshots (Supplementary)', topics: [{ name: 'The Summer of the Beautiful White Horse' }, { name: 'The Address' }, { name: "Ranga's Marriage" }, { name: 'Albert Einstein at School' }, { name: "Mother's Day" }, { name: 'Birth' }, { name: 'The Tale of Melon City' }] },
                { name: 'Writing Skills', topics: [{ name: 'Note-making and Summarising' }, { name: 'Factual Description' }, { name: 'Report Writing' }, { name: 'Letters to the Editor' }] },
                { name: 'Grammar', topics: [{ name: 'Determiners' }, { name: 'Tenses' }, { name: 'Prepositions' }, { name: 'Clauses' }, { name: 'Transformation of Sentences' }] },
            ]
        },
    ]
}

// ─── Class 12 ──────────────────────────────────────────────────────────────
export const class12CurriculumCBSE: ClassCurriculum = {
    classNumber: 12,
    board: 'CBSE',
    subjects: [
        {
            name: 'Physics',
            chapters: [
                { name: 'Electric Charges and Fields', topics: [{ name: 'Electric Charge' }, { name: 'Conductors and Insulators' }, { name: "Coulomb's Law" }, { name: 'Electric Field' }, { name: "Gauss's Law" }] },
                { name: 'Electrostatic Potential and Capacitance', topics: [{ name: 'Electrostatic Potential' }, { name: 'Equipotential Surfaces' }, { name: 'Capacitors and Capacitance' }, { name: 'Energy Stored in a Capacitor' }] },
                { name: 'Current Electricity', topics: [{ name: 'Electric Current' }, { name: "Ohm's Law" }, { name: 'Electrical Resistivity' }, { name: 'Cells and EMF' }, { name: "Kirchhoff's Laws" }, { name: 'Wheatstone Bridge' }] },
                { name: 'Moving Charges and Magnetism', topics: [{ name: 'Magnetic Force' }, { name: 'Motion in a Magnetic Field' }, { name: 'Biot-Savart Law' }, { name: "Ampere's Circuital Law" } ] },
                { name: 'Magnetism and Matter', topics: [{ name: 'The Bar Magnet' }, { name: "Earth's Magnetism" }, { name: 'Magnetisation and Magnetic Intensity' }] },
                { name: 'Electromagnetic Induction', topics: [{ name: "Faraday's Law of Induction" }, { name: 'Motional EMF' }, { name: "Lenz's Law" }, { name: 'Inductance' }] },
                { name: 'Alternating Current', topics: [{ name: 'AC Voltage Applied to Resistor, Inductor, Capacitor' }, { name: 'Series LCR Circuit' }, { name: 'Power in AC Circuit' }, { name: 'Transformers' }] },
                { name: 'Electromagnetic Waves', topics: [{ name: 'Displacement Current' }, { name: 'Electromagnetic Waves' }, { name: 'Electromagnetic Spectrum' }] },
                { name: 'Ray Optics and Optical Instruments', topics: [{ name: 'Reflection by Spherical Mirrors' }, { name: 'Refraction' }, { name: 'Refraction by Lenses' }, { name: 'Prism' }, { name: 'Optical Instruments' }] },
                { name: 'Wave Optics', topics: [{ name: 'Huygens Principle' }, { name: 'Interference' }, { name: 'Diffraction' }, { name: 'Polarisation' }] },
                { name: 'Dual Nature of Radiation and Matter', topics: [{ name: 'Electron Emission' }, { name: 'Photoelectric Effect' }, { name: "Einstein's Photoelectric Equation" }, { name: 'Wave Nature of Matter' }] },
                { name: 'Atoms', topics: [{ name: "Rutherford's Nuclear Model" }, { name: 'Atomic Spectra' }, { name: "Bohr Model of Hydrogen Atom" }] },
                { name: 'Nuclei', topics: [{ name: 'Composition and Size of Nucleus' }, { name: 'Radioactivity' }, { name: 'Nuclear Energy' }] },
                { name: 'Semiconductor Electronics', topics: [{ name: 'Intrinsic Semiconductor' }, { name: 'p-n Junction' }, { name: 'Rectifier' }, { name: 'Junction Transistor' }, { name: 'Logic Gates' }] },
            ]
        },
        {
            name: 'Chemistry',
            chapters: [
                { name: 'The Solid State', topics: [{ name: 'Amorphous and Crystalline Solids' }, { name: 'Crystal Lattices and Unit Cells' }, { name: 'Defects in Solids' }] },
                { name: 'Solutions', topics: [{ name: 'Types of Solutions' }, { name: 'Expressing Concentration of Solutions' }, { name: "Raoult's Law" }, { name: 'Colligative Properties' }] },
                { name: 'Electrochemistry', topics: [{ name: 'Electrochemical Cells' }, { name: 'Galvanic Cells' }, { name: 'Nernst Equation' }, { name: 'Electrolytic Cells' }, { name: 'Batteries and Fuel Cells' }] },
                { name: 'Chemical Kinetics', topics: [{ name: 'Rate of a Chemical Reaction' }, { name: 'Factors Influencing Rate' }, { name: 'Integrated Rate Equations' }, { name: 'Activation Energy' }] },
                { name: 'Surface Chemistry', topics: [{ name: 'Adsorption' }, { name: 'Catalysis' }, { name: 'Colloids' }, { name: 'Emulsions' }] },
                { name: 'General Principles of Isolation of Elements', topics: [{ name: 'Principles and Methods of Extraction' }, { name: 'Refining' }] },
                { name: 'p-Block Elements (Groups 15-18)', topics: [{ name: 'Group 15 Elements' }, { name: 'Group 16 Elements' }, { name: 'Halogens: Group 17' }, { name: 'Noble Gases: Group 18' }] },
                { name: 'd and f Block Elements', topics: [{ name: 'Properties of Transition Metals' }, { name: 'Important Compounds' }, { name: 'Inner Transition Elements' }] },
                { name: 'Coordination Compounds', topics: [{ name: "Werner's Theory" }, { name: 'Nomenclature' }, { name: 'Isomerism' }, { name: 'VBT and CFT' }] },
                { name: 'Haloalkanes and Haloarenes', topics: [{ name: 'Classification and Nomenclature' }, { name: 'Methods of Preparation' }, { name: 'Chemical Reactions' }] },
                { name: 'Alcohols, Phenols and Ethers', topics: [{ name: 'Classification and Nomenclature' }, { name: 'Methods of Preparation' }, { name: 'Chemical Properties' }] },
                { name: 'Aldehydes, Ketones and Carboxylic Acids', topics: [{ name: 'Nomenclature and Structure' }, { name: 'Preparation' }, { name: 'Physical and Chemical Properties' }] },
                { name: 'Amines', topics: [{ name: 'Structure and Classification' }, { name: 'Methods of Preparation' }, { name: 'Chemical Properties' }, { name: 'Diazonium Salts' }] },
                { name: 'Biomolecules', topics: [{ name: 'Carbohydrates' }, { name: 'Proteins' }, { name: 'Enzymes' }, { name: 'Vitamins' }, { name: 'Nucleic Acids' }] },
                { name: 'Polymers', topics: [{ name: 'Classification of Polymers' }, { name: 'Types of Polymerisation' }, { name: 'Biodegradable Polymers' }] },
                { name: 'Chemistry in Everyday Life', topics: [{ name: 'Drugs and their Classification' }, { name: 'Chemicals in Food' }, { name: 'Cleansing Agents' }] },
            ]
        },
        {
            name: 'Mathematics',
            chapters: [
                { name: 'Relations and Functions', topics: [{ name: 'Types of Relations' }, { name: 'Types of Functions' }, { name: 'Composition of Functions and Invertible Function' }, { name: 'Binary Operations' }] },
                { name: 'Inverse Trigonometric Functions', topics: [{ name: 'Basic Concepts' }, { name: 'Properties of Inverse Trigonometric Functions' }] },
                { name: 'Matrices', topics: [{ name: 'Types of Matrices' }, { name: 'Operations on Matrices' }, { name: 'Transpose and Symmetric Matrices' }, { name: 'Invertible Matrices' }] },
                { name: 'Determinants', topics: [{ name: 'Properties of Determinants' }, { name: 'Area of a Triangle' }, { name: 'Adjoint and Inverse of a Matrix' }, { name: 'Applications' }] },
                { name: 'Continuity and Differentiability', topics: [{ name: 'Continuity' }, { name: 'Differentiability' }, { name: 'Derivatives of Composite and Implicit Functions' }, { name: 'Exponential and Logarithmic Functions' }, { name: 'Mean Value Theorem' }] },
                { name: 'Application of Derivatives', topics: [{ name: 'Rate of Change of Quantities' }, { name: 'Increasing and Decreasing Functions' }, { name: 'Tangents and Normals' }, { name: 'Maxima and Minima' }] },
                { name: 'Integrals', topics: [{ name: 'Integration as Inverse Process' }, { name: 'Methods of Integration' }, { name: 'Integration by Partial Fractions' }, { name: 'Definite Integral' }] },
                { name: 'Application of Integrals', topics: [{ name: 'Area under Simple Curves' }, { name: 'Area between Two Curves' }] },
                { name: 'Differential Equations', topics: [{ name: 'Basic Concepts' }, { name: 'Formation of Differential Equations' }, { name: 'Methods of Solving' }] },
                { name: 'Vector Algebra', topics: [{ name: 'Types of Vectors' }, { name: 'Addition and Multiplication of Vectors' }, { name: 'Product of Two Vectors' }] },
                { name: 'Three Dimensional Geometry', topics: [{ name: 'Direction Cosines' }, { name: 'Equation of a Line in Space' }, { name: 'Shortest Distance between Lines' }, { name: 'Equation of a Plane' }] },
                { name: 'Linear Programming', topics: [{ name: 'Mathematical Formulation of LPP' }, { name: 'Graphical Method of Solving LPP' }] },
                { name: 'Probability', topics: [{ name: 'Conditional Probability' }, { name: 'Independent Events' }, { name: "Bayes' Theorem" }, { name: 'Random Variables and Probability Distributions' }, { name: 'Binomial Distribution' }] },
            ]
        },
        {
            name: 'Biology',
            chapters: [
                { name: 'Reproduction in Organisms', topics: [{ name: 'Asexual Reproduction' }, { name: 'Sexual Reproduction' }] },
                { name: 'Sexual Reproduction in Flowering Plants', topics: [{ name: 'Pre-fertilisation: Structures and Events' }, { name: 'Double Fertilisation' }, { name: 'Post-fertilisation' }] },
                { name: 'Human Reproduction', topics: [{ name: 'Male Reproductive System' }, { name: 'Female Reproductive System' }, { name: 'Gametogenesis' }, { name: 'Menstrual Cycle' }, { name: 'Fertilisation and Development' }] },
                { name: 'Reproductive Health', topics: [{ name: 'Population Stabilisation and Birth Control' }, { name: 'STDs' }, { name: 'Infertility' }] },
                { name: 'Principles of Inheritance and Variation', topics: [{ name: "Mendel's Laws of Inheritance" }, { name: 'Inheritance of One Gene' }, { name: 'Sex Determination' }, { name: 'Mutation' }, { name: 'Genetic Disorders' }] },
                { name: 'Molecular Basis of Inheritance', topics: [{ name: 'The DNA' }, { name: 'Replication' }, { name: 'Transcription' }, { name: 'Genetic Code' }, { name: 'Translation' }, { name: 'Gene Expression and Regulation' }] },
                { name: 'Evolution', topics: [{ name: 'Origin of Life' }, { name: 'Mechanisms of Evolution' }, { name: 'Hardy-Weinberg Principle' }, { name: 'Human Evolution' }] },
                { name: 'Human Health and Disease', topics: [{ name: 'Common Diseases in Humans' }, { name: 'Immunity' }, { name: 'AIDS' }, { name: 'Cancer' }, { name: 'Drugs and Alcohol Abuse' }] },
                { name: 'Strategies for Enhancement in Food Production', topics: [{ name: 'Animal Husbandry' }, { name: 'Plant Breeding' }, { name: 'Tissue Culture' }] },
                { name: 'Microbes in Human Welfare', topics: [{ name: 'Microbes in Household Products' }, { name: 'Microbes in Industrial Products' }, { name: 'Microbes in Sewage Treatment' }] },
                { name: 'Biotechnology: Principles and Processes', topics: [{ name: 'Principles of Biotechnology' }, { name: 'Tools of Recombinant DNA Technology' }, { name: 'Processes of rDNA Technology' }] },
                { name: 'Biotechnology and its Applications', topics: [{ name: 'Biotechnological Applications in Agriculture' }, { name: 'Biotechnological Applications in Medicine' }, { name: 'Transgenic Animals' }] },
                { name: 'Organisms and Populations', topics: [{ name: 'Organism and its Environment' }, { name: 'Major Abiotic Factors' }, { name: 'Populations' }, { name: 'Population Interactions' }] },
                { name: 'Ecosystem', topics: [{ name: 'Ecosystem: Structure and Function' }, { name: 'Productivity' }, { name: 'Energy Flow' }, { name: 'Ecological Pyramids' }, { name: 'Nutrient Cycling' }] },
                { name: 'Biodiversity and Conservation', topics: [{ name: 'Biodiversity' }, { name: 'Loss of Biodiversity' }, { name: 'Conservation of Biodiversity' }] },
                { name: 'Environmental Issues', topics: [{ name: 'Air Pollution and its Control' }, { name: 'Water Pollution and its Control' }, { name: 'Greenhouse Effect and Global Warming' }] },
            ]
        },
        {
            name: 'English',
            chapters: [
                { name: 'Flamingo (Prose)', topics: [{ name: 'The Last Lesson' }, { name: 'Lost Spring' }, { name: 'Deep Water' }, { name: 'The Rattrap' }, { name: 'Indigo' }, { name: 'Poets and Pancakes' }, { name: 'The Interview' }, { name: 'Going Places' }] },
                { name: 'Flamingo (Poetry)', topics: [{ name: 'My Mother at Sixty-six' }, { name: 'An Elementary School Classroom in a Slum' }, { name: 'Keeping Quiet' }, { name: 'A Thing of Beauty' }, { name: 'A Roadside Stand' }, { name: "Aunt Jennifer's Tigers" }] },
                { name: 'Vistas (Supplementary)', topics: [{ name: 'The Third Level' }, { name: 'The Tiger King' }, { name: 'Journey to the End of the Earth' }, { name: 'The Enemy' }, { name: 'Should Wizard Hit Mommy?' }, { name: 'On the Face of It' }, { name: 'Evans Tries an O-Level' }] },
                { name: 'Writing Skills', topics: [{ name: 'Notices and Classified Advertisements' }, { name: 'Posters' }, { name: 'Letters to the Editor' }, { name: 'Articles, Speeches, Reports' }] },
                { name: 'Grammar', topics: [{ name: 'Reading Comprehension' }, { name: 'Gap Filling' }, { name: 'Editing or Omission' }, { name: 'Sentence Reordering' }] },
            ]
        },
    ]
}
