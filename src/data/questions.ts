export interface Question {
    id?: string;
    numb: number;
    question: string;
    answer: string;
    options: string[];
}

export const initialQuestions: Question[] = [
    {
        "numb": 1,
        "question": "The 'Oh-My-God' particle detected in 1991 had an energy of 320 exa-electronvolts. This is equivalent to what object traveling at 60 mph?",
        "answer": "A baseball",
        "options": ["A baseball", "A bowling ball", "A marble", "A lead pellet"]
    },
    {
        "numb": 2,
        "question": "Which metallic element possesses the highest melting point of all pure elements at 3,422 degrees Celsius?",
        "answer": "Tungsten",
        "options": ["Carbon", "Osmium", "Tantalum", "Tungsten"]
    },
    {
        "numb": 3,
        "question": "In the Standard Model, which fundamental boson is associated with the field that grants mass to other elementary particles?",
        "answer": "Higgs boson",
        "options": ["Higgs boson", "Gluon", "Photon", "W boson"]
    },
    {
        "numb": 4,
        "question": "In 1972, which executive became the first woman to serve as the CEO of a Fortune 500 company?",
        "answer": "Katharine Graham",
        "options": ["Mary Barra", "Meg Whitman", "Katharine Graham", "Indra Nooyi"]
    },
    {
        "numb": 5,
        "question": "The Black-Scholes-Merton model is a mathematical framework primarily used to calculate what in modern finance?",
        "answer": "Theoretical price of options",
        "options": ["Theoretical price of options", "Corporate credit ratings", "Economic inflation rates", "Optimal inventory levels"]
    },
    {
        "numb": 6,
        "question": "Which company's 1966 IPO is considered the first major success for the modern venture capital industry?",
        "answer": "Digital Equipment Corporation",
        "options": ["Intel", "Digital Equipment Corporation", "Apple", "Microsoft"]
    },
    {
        "numb": 7,
        "question": "Introduced in 1971, what was the world's first commercially produced single-chip microprocessor?",
        "answer": "Intel 4004",
        "options": ["Intel 8008", "Motorola 6800", "Zilog Z80", "Intel 4004"]
    },
    {
        "numb": 8,
        "question": "In the RSA public-key cryptosystem, the letters R, S, and A represent the surnames of which three inventors?",
        "answer": "Rivest, Shamir, and Adleman",
        "options": ["Random Secure Authentication", "Rivest, Shamir, and Adleman", "Robust System Architecture", "Reed-Solomon Algorithm"]
    },
    {
        "numb": 9,
        "question": "Which programming language developed at Sun Microsystems was originally named 'Oak'?",
        "answer": "Java",
        "options": ["Python", "C++", "Java", "Ruby"]
    },
    {
        "numb": 10,
        "question": "Who led the first expedition to successfully reach the geographic South Pole in December 1911?",
        "answer": "Roald Amundsen",
        "options": ["Roald Amundsen", "Robert Falcon Scott", "Ernest Shackleton", "Richard Byrd"]
    },
    {
        "numb": 11,
        "question": "Which 1863 battle is cited as the 'high-water mark of the Confederacy' during the American Civil War?",
        "answer": "Battle of Gettysburg",
        "options": ["Battle of Antietam", "Battle of Bull Run", "Battle of Gettysburg", "Battle of Vicksburg"]
    },
    {
        "numb": 12,
        "question": "Written in the 11th century, who is credited with authoring 'The Tale of Genji'?",
        "answer": "Murasaki Shikibu",
        "options": ["Sei Shonagon", "Murasaki Shikibu", "Ono no Komachi", "Izumi Shikibu"]
    },
    {
        "numb": 13,
        "question": "Which country officially has the most time zones due to its numerous overseas territories?",
        "answer": "France",
        "options": ["Russia", "USA", "France", "China"]
    },
    {
        "numb": 14,
        "question": "Out of all 50 U.S. states, which letter of the alphabet does not appear in any state name?",
        "answer": "Q",
        "options": ["Z", "J", "X", "Q"]
    },
    {
        "numb": 15,
        "question": "Based on statistical simulations, what is the most landed-on property in the classic board game Monopoly?",
        "answer": "Illinois Avenue",
        "options": ["Boardwalk", "Illinois Avenue", "Reading Railroad", "Go"]
    }
];
