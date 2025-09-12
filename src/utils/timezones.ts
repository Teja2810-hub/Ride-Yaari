export const timezones = [
  { value: 'America/New_York', label: 'Eastern Time (EST/EDT)', offset: 'UTC-5/-4' },
  { value: 'America/Chicago', label: 'Central Time (CST/CDT)', offset: 'UTC-6/-5' },
  { value: 'America/Denver', label: 'Mountain Time (MST/MDT)', offset: 'UTC-7/-6' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)', offset: 'UTC-8/-7' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKST/AKDT)', offset: 'UTC-9/-8' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)', offset: 'UTC-10' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT/BST)', offset: 'UTC+0/+1' },
  { value: 'Europe/Paris', label: 'Central European Time (CET/CEST)', offset: 'UTC+1/+2' },
  { value: 'Europe/Berlin', label: 'Central European Time (CET/CEST)', offset: 'UTC+1/+2' },
  { value: 'Europe/Rome', label: 'Central European Time (CET/CEST)', offset: 'UTC+1/+2' },
  { value: 'Europe/Madrid', label: 'Central European Time (CET/CEST)', offset: 'UTC+1/+2' },
  { value: 'Europe/Amsterdam', label: 'Central European Time (CET/CEST)', offset: 'UTC+1/+2' },
  { value: 'Europe/Brussels', label: 'Central European Time (CET/CEST)', offset: 'UTC+1/+2' },
  { value: 'Europe/Vienna', label: 'Central European Time (CET/CEST)', offset: 'UTC+1/+2' },
  { value: 'Europe/Zurich', label: 'Central European Time (CET/CEST)', offset: 'UTC+1/+2' },
  { value: 'Europe/Stockholm', label: 'Central European Time (CET/CEST)', offset: 'UTC+1/+2' },
  { value: 'Europe/Oslo', label: 'Central European Time (CET/CEST)', offset: 'UTC+1/+2' },
  { value: 'Europe/Copenhagen', label: 'Central European Time (CET/CEST)', offset: 'UTC+1/+2' },
  { value: 'Europe/Helsinki', label: 'Eastern European Time (EET/EEST)', offset: 'UTC+2/+3' },
  { value: 'Europe/Athens', label: 'Eastern European Time (EET/EEST)', offset: 'UTC+2/+3' },
  { value: 'Europe/Istanbul', label: 'Turkey Time (TRT)', offset: 'UTC+3' },
  { value: 'Europe/Moscow', label: 'Moscow Time (MSK)', offset: 'UTC+3' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)', offset: 'UTC+4' },
  { value: 'Asia/Karachi', label: 'Pakistan Standard Time (PKT)', offset: 'UTC+5' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)', offset: 'UTC+5:30' },
  { value: 'Asia/Dhaka', label: 'Bangladesh Standard Time (BST)', offset: 'UTC+6' },
  { value: 'Asia/Bangkok', label: 'Indochina Time (ICT)', offset: 'UTC+7' },
  { value: 'Asia/Singapore', label: 'Singapore Standard Time (SGT)', offset: 'UTC+8' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong Time (HKT)', offset: 'UTC+8' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)', offset: 'UTC+8' },
  { value: 'Asia/Taipei', label: 'Taipei Standard Time (TST)', offset: 'UTC+8' },
  { value: 'Asia/Manila', label: 'Philippine Standard Time (PST)', offset: 'UTC+8' },
  { value: 'Asia/Jakarta', label: 'Western Indonesian Time (WIB)', offset: 'UTC+7' },
  { value: 'Asia/Kuala_Lumpur', label: 'Malaysia Time (MYT)', offset: 'UTC+8' },
  { value: 'Asia/Seoul', label: 'Korea Standard Time (KST)', offset: 'UTC+9' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)', offset: 'UTC+9' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AEST/AEDT)', offset: 'UTC+10/+11' },
  { value: 'Australia/Melbourne', label: 'Australian Eastern Time (AEST/AEDT)', offset: 'UTC+10/+11' },
  { value: 'Australia/Brisbane', label: 'Australian Eastern Standard Time (AEST)', offset: 'UTC+10' },
  { value: 'Australia/Perth', label: 'Australian Western Standard Time (AWST)', offset: 'UTC+8' },
  { value: 'Australia/Adelaide', label: 'Australian Central Time (ACST/ACDT)', offset: 'UTC+9:30/+10:30' },
  { value: 'Pacific/Auckland', label: 'New Zealand Time (NZST/NZDT)', offset: 'UTC+12/+13' },
  { value: 'America/Toronto', label: 'Eastern Time (EST/EDT)', offset: 'UTC-5/-4' },
  { value: 'America/Vancouver', label: 'Pacific Time (PST/PDT)', offset: 'UTC-8/-7' },
  { value: 'America/Montreal', label: 'Eastern Time (EST/EDT)', offset: 'UTC-5/-4' },
  { value: 'America/Sao_Paulo', label: 'Brasília Time (BRT/BRST)', offset: 'UTC-3/-2' },
  { value: 'America/Mexico_City', label: 'Central Time (CST/CDT)', offset: 'UTC-6/-5' },
  { value: 'America/Buenos_Aires', label: 'Argentina Time (ART)', offset: 'UTC-3' },
  { value: 'America/Lima', label: 'Peru Time (PET)', offset: 'UTC-5' },
  { value: 'America/Bogota', label: 'Colombia Time (COT)', offset: 'UTC-5' },
  { value: 'America/Santiago', label: 'Chile Time (CLT/CLST)', offset: 'UTC-4/-3' },
  { value: 'Africa/Cairo', label: 'Eastern European Time (EET)', offset: 'UTC+2' },
  { value: 'Africa/Lagos', label: 'West Africa Time (WAT)', offset: 'UTC+1' },
  { value: 'Africa/Nairobi', label: 'East Africa Time (EAT)', offset: 'UTC+3' },
  { value: 'Africa/Johannesburg', label: 'South Africa Standard Time (SAST)', offset: 'UTC+2' },
  { value: 'Africa/Casablanca', label: 'Western European Time (WET/WEST)', offset: 'UTC+0/+1' }
]

export const getDefaultTimezone = (): string => {
  return 'America/New_York' // Default to EST as requested
}

export const formatTimeWithTimezone = (time: string, timezone: string): string => {
  if (!time) return ''
  
  try {
    const date = new Date(`2000-01-01T${time}:00`)
    return date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  } catch (error) {
    return time
  }
}