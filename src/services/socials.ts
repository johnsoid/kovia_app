/**
 * Represents a social media profile.
 */
export interface SocialProfile {
  /**
   * The label or name of the social media platform (e.g., 'YouTube', 'Instagram').
   */
  label: string;
  /**
   * The URL of the social media profile.
   */
  url: string;
}

/**
 * Asynchronously retrieves social media profiles for a given performer.
 *
 * @param username The username of the performer.
 * @returns A promise that resolves to an array of SocialProfile objects.
 */
export async function getSocialProfiles(username: string): Promise<SocialProfile[]> {
  // TODO: Implement this by calling an API.

  return [
    {
      label: 'YouTube',
      url: 'https://www.youtube.com/@LouisJohnsonComedy',
    },
    {
      label: 'Instagram',
      url: 'https://instagram.com/louiscomedy',
    },
  ];
}
