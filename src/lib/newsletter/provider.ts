/**
 * The list provider behind `POST /api/subscribe`. One interface, one file per
 * provider; `getListProvider()` returns the one the install has set up. Kit
 * is the first; the CMS's own list (newsletter mission, phase 1) is the second.
 * Server only.
 */

import { getKitConfig, markKitRejected } from "@/lib/db/integrations";
import { KitAuthError, kitSubscribe } from "./kit";

export interface SubscribeOptions {
  /** Which list the person asked for ("news", "studio"); a provider with one list ignores it. */
  list?: string;
  /** Where the sign-up came from ("footer", "home"), or a page URL. */
  source?: string;
}

export interface ListProvider {
  readonly name: string;
  /**
   * Add `email` to the list. Resolves when the provider has accepted it, also
   * when the address was already there (membership is never reported back).
   * Rejects with a readable message when the provider refused or couldn't be reached.
   */
  subscribe(email: string, options: SubscribeOptions): Promise<void>;
}

/** The provider that's set up and ready to take sign-ups, or null when there isn't one. */
export async function getListProvider(): Promise<ListProvider | null> {
  const kit = await getKitConfig();
  if (!kit || !kit.form) return null;
  const { apiKey, form, tag } = kit;
  return {
    name: "kit",
    async subscribe(email, { source }) {
      try {
        await kitSubscribe(apiKey, { formId: form.id, tagId: tag?.id ?? null, email, source });
      } catch (error) {
        if (error instanceof KitAuthError) await markKitRejected(error.message);
        throw error;
      }
    },
  };
}
