// Pre-loaded user profile
// TDEE: 41M, 249lbs, moderately active
// Harris-Benedict: BMR = 88.362 + (13.397 × 113kg) + (4.799 × 178cm) - (5.677 × 41)
// Using lbs/inches: BMR = 66 + (6.23 × 249) + (12.7 × 69) - (6.8 × 41) ≈ 2135
// Moderately active × 1.55 ≈ 3309 TDEE
// Deficit 500 = 2809 target
// Workout days: add 300 = 3109

export const USER_PROFILE = {
  name: 'Chris',
  age: 41,
  sex: 'M',
  weightLbs: 249,
  bodyFatPercent: 25,
  targetWeightLbs: 225,
  experienceYears: 10,
  conditions: ['knee arthritis', 'elbow tendonitis', 'lower back (form-dependent)'],
  tdee: 3309,
  calorieTarget: 2809,      // TDEE - 500
  workoutDayCalories: 3109, // TDEE - 500 + 300
  proteinTargetG: 200,      // ~0.8g per lb of target weight
  carbTargetG: 250,
  fatTargetG: 78,
};
