type PenaltyType = "Fixed Price" | "Percentage"; 

export function calculatePenaltyNew(
  dueDate: Date,
  amount: number,
  occurrence: "Recurring" | "One Time", 
  recurringFrequency: number | null,
  penaltyType: PenaltyType,
  penaltyValue: number
): number {
  const currentDate = new Date();
  if (currentDate <= dueDate) return 0; // No penalty if within due date

  let penalty = 0;
  let overdueDays = Math.floor(
    (currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (penaltyType === "Fixed Price") {
    penalty = penaltyValue;
  } else if (penaltyType === "Percentage") {
    penalty = (penaltyValue / 100) * amount;
  }

  if (occurrence === "Recurring" && recurringFrequency) {
    const timesPenaltyApplied = Math.floor(overdueDays / recurringFrequency);
    penalty *= timesPenaltyApplied;
  }

  return penalty;
}
