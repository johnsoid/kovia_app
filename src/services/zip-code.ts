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
  // TODO: Implement this by calling an API.

  return {
    city: 'Beverly Hills',
    state: 'CA',
  };
}
