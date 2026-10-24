// Visual descriptions are not measurements or certification. Fail closed on
// unsupported quantitative quality claims even if the provider ignores prompts.
export function photoObservation(text: string): string | null {
  text = text.trim().normalize("NFKC");
  const number = /\d|\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)\b/i.test(text);
  const numericQuality = number && /(?:%|percent|kcal|kj|mj|gj|kwh|btu|\bj\s*\/\s*kg|moisture|water content|calorific|energy|heating value|ash(?:\s+content)?)/i.test(text);
  const grade = /\b(?:certified|certification|grade\b|class\s*[a-z]{1,3}\d?\b)/i.test(text);
  return numericQuality || grade ? null : text;
}
