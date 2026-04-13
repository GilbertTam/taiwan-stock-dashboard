import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

/** Resolve localized area name from English area code. Uses common:areas namespace. */
export function getAreaName(t: TFunction, areaCode: string): string {
  return t(`common:areas.${areaCode}`, { defaultValue: areaCode });
}

/** Convenience hook returning a bound area name resolver. */
export function useAreaName() {
  const { t } = useTranslation('common');
  return (areaCode: string) => getAreaName(t, areaCode);
}
