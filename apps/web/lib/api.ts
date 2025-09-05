export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function registerUser(userData: {
  privyUserId: string;
  email: string;
  walletAddress?: string;
}) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

/**
 * Fetch boilerplate components that should be created before each project
 */
export async function fetchBoilerplateComponents(): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/boilerplate`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch boilerplate: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    console.error("Error fetching boilerplate components:", error);
    return ""; // Return empty string as fallback
  }
}
