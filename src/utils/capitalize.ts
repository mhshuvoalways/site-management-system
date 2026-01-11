/**
 * Capitalizes the first letter of each word in a string
 * Example: "magnet drill" -> "Magnet Drill"
 */
export function capitalizeWords(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
