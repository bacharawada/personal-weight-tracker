/**
 * Type augmentation for react-i18next.
 *
 * Binds `t()` to the English resource shape so namespace names and keys are
 * autocompleted and type-checked across the app. `returnNull: false` matches
 * the runtime init so `t()` is typed as `string`, never `string | null`.
 */

import "react-i18next";
import type { AppResources, defaultNS } from "./resources";

declare module "react-i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: AppResources;
    returnNull: false;
  }
}
