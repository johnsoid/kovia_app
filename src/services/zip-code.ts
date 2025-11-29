/**
 * Represents a zip code with associated information.
 */
export interface ZipCodeInfo {
  /**
   * The city associated with the zip code.
   */
  city: string;
  /**
   * The state associated with the zip code.
   */
  state: string;
}

/**
 * Asynchronously retrieves information for a given zip code.
 *
 * @param zipCode The zip code to look up.
 * @returns A promise that resolves to a ZipCodeInfo object containing city and state.
 */
export async function getZipCodeInfo(zipCode: string): Promise<ZipCodeInfo> {
  try {
    const response = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
    if (!response.ok) {
      // Return empty or throw, but for now let's just return empty values so the UI handles it gracefully or we can throw to let the caller handle it.
      // The caller (page.tsx) catches errors.
      throw new Error('Invalid zip code');
    }
    const data = await response.json();
    if (data.places && data.places.length > 0) {
      return {
        city: data.places[0]['place name'],
        state: data.places[0]['state abbreviation'],
      };
    }
    throw new Error('No place found for zip code');
  } catch (error) {
    // console.error("Error fetching zip code info:", error); 
    // Re-throw to let the component handle the error state
    throw error;
  }
}
