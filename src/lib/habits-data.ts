export type HabitCadence = "daily" | "weekly" | "monthly";

export type Habit = {
  id: string;
  label: string;
  cadence: HabitCadence;
  xp: number;
};

export const habits: Habit[] = [
  { id: "no-alcohol", label: "Sin alcohol hoy", cadence: "daily", xp: 15 },
  { id: "no-junk-food", label: "Sin comida chatarra / snacks", cadence: "daily", xp: 15 },
  { id: "no-sugary-drinks", label: "Sin bebidas azucaradas / soda", cadence: "daily", xp: 10 },
  { id: "water", label: "Suficiente agua hoy", cadence: "daily", xp: 10 },
  { id: "steps", label: "8,000+ pasos hoy", cadence: "daily", xp: 10 },
  { id: "sleep-week", label: "Dormir 7+ horas, 5 de 7 noches", cadence: "weekly", xp: 40 },
  { id: "no-alcohol-week", label: "Semana completa sin alcohol", cadence: "weekly", xp: 50 },
  { id: "no-alcohol-month", label: "Mes completo sin alcohol", cadence: "monthly", xp: 200 },
  { id: "consistency-month", label: "Consistencia real todo el mes, sin excusas", cadence: "monthly", xp: 200 },
];

export const nutritionTips: string[] = [
  "Deficit moderado de 300-500 kcal diarias, no mas. Calcula tu BMR y sumale lo que quemas entrenando.",
  "Proteina alta: 1.6-2.2 g por kg de peso corporal. Pollo, huevo, pescado, yogurt griego, carne magra.",
  "Fibra en cada comida (vegetales, frutas, champinones): da volumen, quita hambre, cuesta menos calorias.",
  "8,000-12,000 pasos diarios. Caminar despues de comer ayuda con la sensibilidad a la insulina y la hinchazon.",
  "Agua suficiente todos los dias. Deshidratado, el cuerpo retiene liquido y todo se ve mas hinchado.",
  "7-9 horas de sueno. Los abdominales tambien se construyen durmiendo.",
  "Comidas simples y consistentes pesan mas que una semana perfecta. Los habitos de meses ganan, no los sprints.",
];
