export const timezones = [
  { value: 'EST', label: 'EST - Eastern Standard Time', offset: 'UTC-5' },
  { value: 'CST', label: 'CST - Central Standard Time', offset: 'UTC-6' },
  { value: 'MST', label: 'MST - Mountain Standard Time', offset: 'UTC-7' },
  { value: 'PST', label: 'PST - Pacific Standard Time', offset: 'UTC-8' },
  { value: 'AKST', label: 'AKST - Alaska Standard Time', offset: 'UTC-9' },
  { value: 'HST', label: 'HST - Hawaii Standard Time', offset: 'UTC-10' },
  { value: 'GMT', label: 'GMT - Greenwich Mean Time', offset: 'UTC+0' },
  { value: 'CET', label: 'CET - Central European Time', offset: 'UTC+1' },
  { value: 'EET', label: 'EET - Eastern European Time', offset: 'UTC+2' },
  { value: 'TRT', label: 'TRT - Turkey Time', offset: 'UTC+3' },
  { value: 'MSK', label: 'MSK - Moscow Time', offset: 'UTC+3' },
  { value: 'GST', label: 'GST - Gulf Standard Time', offset: 'UTC+4' },
  { value: 'PKT', label: 'PKT - Pakistan Standard Time', offset: 'UTC+5' },
  { value: 'IST', label: 'IST - India Standard Time', offset: 'UTC+5:30' },
  { value: 'BST', label: 'BST - Bangladesh Standard Time', offset: 'UTC+6' },
  { value: 'ICT', label: 'ICT - Indochina Time', offset: 'UTC+7' },
  { value: 'SGT', label: 'SGT - Singapore Standard Time', offset: 'UTC+8' },
  { value: 'HKT', label: 'HKT - Hong Kong Time', offset: 'UTC+8' },
  { value: 'CST_CHINA', label: 'CST - China Standard Time', offset: 'UTC+8' },
  { value: 'TST', label: 'TST - Taipei Standard Time', offset: 'UTC+8' },
  { value: 'PST_PHIL', label: 'PST - Philippine Standard Time', offset: 'UTC+8' },
  { value: 'WIB', label: 'WIB - Western Indonesian Time', offset: 'UTC+7' },
  { value: 'MYT', label: 'MYT - Malaysia Time', offset: 'UTC+8' },
  { value: 'KST', label: 'KST - Korea Standard Time', offset: 'UTC+9' },
  { value: 'JST', label: 'JST - Japan Standard Time', offset: 'UTC+9' },
  { value: 'AEST', label: 'AEST - Australian Eastern Standard Time', offset: 'UTC+10' },
  { value: 'ACST', label: 'ACST - Australian Central Standard Time', offset: 'UTC+9:30' },
  { value: 'AWST', label: 'AWST - Australian Western Standard Time', offset: 'UTC+8' },
  { value: 'NZST', label: 'NZST - New Zealand Standard Time', offset: 'UTC+12' },
  { value: 'BRT', label: 'BRT - Brasília Time', offset: 'UTC-3' },
  { value: 'ART', label: 'ART - Argentina Time', offset: 'UTC-3' },
  { value: 'PET', label: 'PET - Peru Time', offset: 'UTC-5' },
  { value: 'COT', label: 'COT - Colombia Time', offset: 'UTC-5' },
  { value: 'CLT', label: 'CLT - Chile Time', offset: 'UTC-4' },
  { value: 'WAT', label: 'WAT - West Africa Time', offset: 'UTC+1' },
  { value: 'EAT', label: 'EAT - East Africa Time', offset: 'UTC+3' },
  { value: 'SAST', label: 'SAST - South Africa Standard Time', offset: 'UTC+2' },
  { value: 'WET', label: 'WET - Western European Time', offset: 'UTC+0' }
]

export const getDefaultTimezone = (): string => {
  return 'EST' // Default to EST as requested
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