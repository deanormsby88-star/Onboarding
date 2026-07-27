// Floor plan data extracted from Floor_Plan.xlsx ("Floor Plan" + "Employee Number" sheets).
// Desk numbers on the plan map to the employee list; rooms were derived from the
// bordered regions of the plan. Management, 23 (IT / Tiago) and 25 (AM & HR) are
// intentionally excluded from the walk, as are unstaffed spaces (storerooms,
// bathrooms, canteen, kitchen, reception).

export interface Employee {
  number: number;
  name: string;
}

export interface Room {
  id: string;
  name: string;
  employeeNumbers: number[];
}

export const WALKERS = [
  "Mo",
  "Jesse",
  "Dean",
  "Zozo",
  "Aidan",
  "Demetri",
  "Steph",
  "Bongi",
  "Tiago",
] as const;

export const EMPLOYEES: Record<number, string> = {
  1: "Busiswe Mogashoa",
  2: "Teneshia Nereling",
  4: "Nechama Sher",
  5: "Asiphe Qulu",
  6: "Thabang Lepebe",
  7: "Terese Dos Santos",
  8: "Avigail Bellon",
  9: "Walter Moyo",
  10: "Tisetso Morobi",
  11: "Mbalenhle Nhlapo",
  12: "Moloko Ramashapa",
  13: "Mbali Nkosi",
  14: "Dovi Goldberg",
  15: "Hayden Cigler",
  16: "Aaron Seinker",
  17: "Zinon Bitirimoglu",
  19: "Dolvend Selane",
  20: "Ontswanetsi Ditsego (John)",
  21: "Faith Bonang Tobia",
  22: "Kgomotso Sebone (Christina)",
  23: "Penelope Mekgwe",
  24: "Candice Mahlangu",
  25: "Lerato Motaung",
  26: "Tamara Nyoni",
  27: "Tyler Labuschagne",
  28: "Lyle James",
  29: "Thabitha Maake",
  30: "Tumelo Rakau",
  31: "Fanele Caswell Mdletshe",
  32: "Buyisiwe Shira Mfobo",
  33: "Ncumisa Mockena",
  34: "Mandisa Tshandu",
  35: "Lebogang Ratema",
  36: "Khumbo Ngwira",
  37: "Katlego Maubane",
  38: "Athenkosi Mzekandaba",
  39: "Bongani Charles Nkambuke",
  40: "Sanele Moloi",
  41: "Noluthando Magengenene",
  42: "Nomfundo Ntuli",
  43: "Keitumetse Penya",
  45: "Shone Landsberg",
  47: "Alex Kusangaya",
  48: "Hope Shumi",
  49: "Unathi Khlwinti",
  50: "Puisano Motshwane",
  51: "Mark Gangiah",
  52: "Charlotte Masenya",
  53: "Sindiswa (Cindy) Segau",
  54: "Colleen Chilioane",
  55: "Mbuso Sokhulu",
  56: "Nqobile Mhlongo",
  57: "Cynthia Zulu",
  58: "Zaakirah Myles",
  59: "Neo Ngobeni",
  60: "Tokolo Morobi",
  61: "Sabelo Mkwanazi",
  62: "Pandelani Sephaladi",
  63: "Sange Bom",
  65: "Precious Nyoni",
  67: "Lesego Manyaka",
  68: "Mbalenhle Radebe",
  69: "Precious Napi",
  70: "Andile Zuma",
  71: "Mpho Masia",
  72: "Mikayla Kangisser",
  73: "Neo Moagi",
  75: "Gugu Sibeko",
  77: "Aphiwe Mkwanazi",
  78: "Thabiso Mabena",
  79: "Nontokozo Phungula",
  80: "Molobogeng Phago",
  81: "Samukelizwe Mashazi",
  82: "Pretty Ngubane",
  83: "Neo Pitsi",
  84: "Mfaniseni Khumalo",
  85: "Tiffany Scheepers",
  86: "Christinah Mokoetla",
  87: "Kganya Mpoelang",
  88: "Thato Mokone",
  89: "Mmaphuti Rankapole",
  90: "Ashleigh Ogle",
  91: "Andile Khumalo",
  92: "Seba Makoboana",
  93: "Amanda Ncube",
  94: "Wandisile Madlala",
  95: "Rendani Phanguphangu",
  96: "Matsidiso Tsotetsi",
  97: "Margarit (Maggie) Mankga",
  98: "Justice Karabo Makwela",
  103: "Keslyn Loforte",
  104: "Roxan Fynn",
  105: "Kimberleigh Mckop",
  106: "Ndzalama Malulke",
  111: "Debbie Derman",
  118: "Cassidy Oosthuizen",
  119: "Melissa Naki",
  120: "Zintle Mdhluli",
  121: "Nelisiwe Ndodana",
  122: "Unam",
  123: "Thapelo Mabaso",
  124: "Nompumelo Simelane",
  125: "Sylvanna Abels",
  126: "Annie Diale",
  127: "Nomusa Nkabinde",
};

// Walk order: starts just outside Management (top-right of the plan) and works
// around the floor. Rooms Management, 23B, 23C and 25 are excluded.
export const ROOMS: Room[] = [
  { id: "24", name: "24 - Claims", employeeNumbers: [88, 89, 95] },
  { id: "22B", name: "22B - Claims", employeeNumbers: [80, 81, 86, 90, 96] },
  { id: "22", name: "22 - Claims", employeeNumbers: [79, 84, 85, 93, 97, 98] },
  { id: "21", name: "21 - Claims", employeeNumbers: [83, 94] },
  { id: "20", name: "20 - Ms Debs Team", employeeNumbers: [49, 51, 106, 111] },
  { id: "19", name: "19 - Seba", employeeNumbers: [92] },
  { id: "17", name: "17 - Crown Display", employeeNumbers: [14, 15, 16, 17] },
  { id: "16", name: "16 - CSR", employeeNumbers: [78, 82, 91] },
  { id: "15", name: "15 - CSR", employeeNumbers: [69, 70] },
  { id: "14", name: "14 - Eligibility", employeeNumbers: [58, 59, 60, 61, 62] },
  { id: "12", name: "12 - Alef", employeeNumbers: [10, 11, 19, 22, 53, 57, 87, 126, 127] },
  {
    id: "11",
    name: "11 - CSR",
    employeeNumbers: [36, 37, 38, 39, 40, 41, 42, 43, 45, 47, 48, 63, 65, 68, 75, 77, 103, 104, 105],
  },
  { id: "10", name: "10 - Miks & Neo", employeeNumbers: [72, 73] },
  { id: "9", name: "9 - Freunds Fish", employeeNumbers: [32, 33, 34, 119, 120] },
  { id: "8", name: "8 - Sunshine", employeeNumbers: [27] },
  { id: "7B", name: "7B - Alef", employeeNumbers: [26, 118] },
  { id: "7", name: "7 - Alef", employeeNumbers: [9, 12, 13, 20, 21, 23, 24, 25] },
  { id: "26", name: "26 - Promote Care / Economeds", employeeNumbers: [31, 55, 71, 122] },
  { id: "5", name: "5 - EB Waste / Lifeline / Care / Omni / Anchor", employeeNumbers: [1, 2, 7, 8, 28, 29] },
  { id: "4", name: "4 - Babysense", employeeNumbers: [50, 52, 54, 56] },
  { id: "3", name: "3 - Sunshine / Thabang", employeeNumbers: [4, 5, 6] },
  { id: "2", name: "2 - DLP", employeeNumbers: [35, 67, 125] },
  { id: "1", name: "1 - A1 / YNM", employeeNumbers: [30, 121, 123, 124] },
];

export type PresenceStatus = "present" | "break" | "absent" | "not_started";
export type NoteCategory = "follow_up" | "hr" | null;

export function getRoom(roomId: string): Room | undefined {
  return ROOMS.find((r) => r.id === roomId);
}

export function roomIndex(roomId: string): number {
  return ROOMS.findIndex((r) => r.id === roomId);
}

export function employeeName(num: number): string {
  return EMPLOYEES[num] ?? `Employee #${num}`;
}
