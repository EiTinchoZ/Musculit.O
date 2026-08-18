// Datos nutricionales del Perfect Split. Fuente: MUSCULITO_UPDATE_SPEC.md
// seccion 4 (spec + HTML de referencia, no el PDF impreso — hay una pequena
// discrepancia entre ambos y Tin confirmo usar el spec+HTML).

export type MacroTuple = [kcal: number, proteinG: number, fatG: number, carbsG: number];

export type MealOption = {
  items: string[];
  macros: MacroTuple;
};

export type Meal = {
  id: string;
  name: string;
  options: MealOption[];
};

export const nutritionTargets = {
  tmb: 1711,
  activityFactor: 1.7,
  maintenanceKcal: 2910,
  surplusKcal: 250,
  calorieGoal: 3150,
  proteinG: 155,
  fatG: 90,
  carbsG: 425,
  waterLiters: 2.8,
};

export const meals: Meal[] = [
  {
    id: "desayuno",
    name: "Desayuno",
    options: [
      { items: ["3 huevos revueltos con espinaca y tomate", "2 tostadas de pan integral", "1 banano pequeño"], macros: [460, 27, 17, 47] },
      { items: ["2-3 huevos revueltos con tomate, espinaca y hongos", "1 tortilla de maíz amarillo asada"], macros: [390, 24, 21, 25] },
      { items: ["Omelet de 2 huevos con jamón de pavo y vegetales", "2 tostadas de pan integral"], macros: [440, 28, 19, 35] },
      { items: ["½ taza de avena con leche de almendras, chía y 4 almendras", "3 huevos cocidos", "Blueberries"], macros: [530, 31, 23, 48] },
      { items: ["1 arepa rellena de huevo revuelto con hongos", "Rebanadas de tomate y aguacate"], macros: [470, 20, 24, 42] },
    ],
  },
  {
    id: "merienda-manana",
    name: "Merienda de la mañana",
    options: [
      { items: ["1 yogur griego", "10 almendras"], macros: [250, 20, 12, 14] },
      { items: ["Batido de fruta con 250 ml de leche de proteína", "1 cdita de chía"], macros: [320, 25, 8, 38] },
      { items: ["2 galletas de arroz con mantequilla de maní", "Jalea sin azúcar"], macros: [280, 8, 14, 32] },
      { items: ["1 manzana verde con mantequilla de maní pura"], macros: [290, 7, 16, 30] },
      { items: ["1 tortilla de trigo con jamón de pavo y aguacate"], macros: [330, 16, 17, 28] },
    ],
  },
  {
    id: "almuerzo",
    name: "Almuerzo",
    options: [
      { items: ["1½ taza de arroz", "250 g de pechuga de pollo a la plancha", "Ensalada verde con ½ aguacate", "½ taza de frijoles"], macros: [845, 73, 20, 94] },
      { items: ["1 taza de arroz o quinoa", "¼ de plátano maduro hervido", "Filete de salmón a la plancha", "Pico de gallo con aguacate y lechuga", "½ chayote hervido"], macros: [880, 60, 32, 85] },
      { items: ["2 tortillas de trigo", "200 g de fajitas de res con cebolla y chile dulce", "Ensalada de repollo con tomate, culantro y limón", "Coliflor hervida"], macros: [780, 58, 28, 70] },
      { items: ["1 taza de puré de papa", "200 g de filete de pescado a la plancha", "Ensalada verde con limón", "½ taza de brócoli al vapor"], macros: [700, 55, 18, 72] },
      { items: ["2 trozos de yuca hervida", "¼ de plátano maduro", "200 g de pollo en salsa de tomate natural", "Ensalada de espinacas con pepino y fresas"], macros: [850, 58, 16, 110] },
    ],
  },
  {
    id: "post-entreno",
    name: "Post-entreno",
    options: [
      { items: ["Batido: 1 scoop de proteína + 1 banano + leche descremada"], macros: [300, 33, 2, 38] },
      { items: ["1 taza de yogur griego con fruta picada y chía"], macros: [260, 24, 6, 28] },
      { items: ["2 huevos duros con aguacate majado y mostaza", "1 galleta de arroz"], macros: [290, 16, 18, 16] },
      { items: ["1 leche de proteína", "1 galleta de arroz con queso cottage y arándanos"], macros: [280, 28, 6, 28] },
    ],
  },
  {
    id: "cena",
    name: "Cena",
    options: [
      { items: ["200 g de carne molida magra con salsa de tomate natural", "3 tortillas de maíz", "2 tazas de ensalada verde con aceite de oliva y limón"], macros: [680, 51, 33, 48] },
      { items: ["Quesadillas de pollo mechado en tortilla integral", "Ensalada encima", "2 huevos cocidos"], macros: [720, 48, 34, 52] },
      { items: ["1 lata de atún con huevo cocido, tomate, apio, aguacate y poca mayonesa light", "2 paquetes de salmas"], macros: [620, 45, 32, 30] },
      { items: ["2 tazas de pasta con atún en agua, maíz dulce y salsa de tomate", "2 huevos hervidos", "1 taza de ensalada"], macros: [830, 55, 22, 95] },
      { items: ["Ensalada grande con 200 g de pollo, aguacate, cottage, garbanzos, maíz y zanahoria", "Aderezo de yogur griego con limón, ajo y culantro"], macros: [700, 58, 30, 45] },
    ],
  },
];

export const extras: { id: string; name: string; macros: MacroTuple }[] = [
  { id: "arroz-extra", name: "1 taza extra de arroz", macros: [200, 4, 0, 44] },
  { id: "medio-aguacate", name: "½ aguacate", macros: [160, 2, 15, 8] },
  { id: "nueces", name: "Puñado de nueces mixtas", macros: [190, 5, 17, 6] },
  { id: "tostadas-mani", name: "2 tostadas con mantequilla de maní", macros: [290, 10, 15, 30] },
  { id: "batido-proteina", name: "1 batido de proteína con leche", macros: [240, 30, 4, 20] },
  { id: "avena", name: "1 taza de avena cocida", macros: [160, 6, 3, 28] },
  { id: "huevos-cocidos", name: "2 huevos cocidos", macros: [145, 13, 10, 1] },
  { id: "fruta", name: "1 banano + 1 manzana", macros: [190, 2, 1, 48] },
];

export const vegetableTips: { title: string; body: string }[] = [
  { title: "Porciona al comprar", body: "Lava y separa en bolsitas lo de toda la semana el mismo día." },
  { title: "Cocina por lote", body: "Un solo día a la semana dejas los vegetales listos." },
  { title: "Salteado rápido", body: "Tomate, brócoli, hongos, mostaza china, repollo y cebolla con 1 cda de aceite de oliva. Acompaña cualquier proteína." },
  { title: "Aderezos libres", body: "Vinagre de manzana, aceite de oliva con especias, limón con sal y pimienta, o vinagre balsámico. No suman calorías." },
  { title: "Congelados válidos", body: "Cuando no hay frescos de buena calidad. Enjuaga bien antes de preparar." },
];

export function getMeal(mealId: string): Meal | undefined {
  return meals.find((meal) => meal.id === mealId);
}

export function sumMacros(tuples: MacroTuple[]): MacroTuple {
  return tuples.reduce<MacroTuple>(
    (total, tuple) => [total[0] + tuple[0], total[1] + tuple[1], total[2] + tuple[2], total[3] + tuple[3]],
    [0, 0, 0, 0],
  );
}
