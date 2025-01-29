import { format } from 'date-fns';
import { getTimezoneOffset, formatInTimeZone } from 'date-fns-tz';

const NSW_TIMEZONE = 'Australia/Sydney';

export const toNSWTime = (date: Date): Date => {
  return new Date(formatInTimeZone(date, NSW_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX"));
};

export const fromNSWTime = (date: Date): Date => {
  const offset = getTimezoneOffset(NSW_TIMEZONE);
  return new Date(date.getTime() - offset);
};

export const formatNSWDate = (date: Date): string => {
  const nswDate = toNSWTime(date);
  return format(nswDate, 'dd/MM/yy');
};

export const formatNSWTime = (date: Date): string => {
  const nswDate = toNSWTime(date);
  return format(nswDate, 'HH:mm');
};

export const getCurrentNSWTime = (): Date => {
  return toNSWTime(new Date());
}; 