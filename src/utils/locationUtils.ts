/**
 * Normalize location strings for better matching
 * Handles common abbreviations and variations in location names
 */
export function normalizeLocationString(location: string): string {
  if (!location) return ''
  
  let normalized = location.toLowerCase().trim()
  
  // Remove common punctuation and extra spaces
  normalized = normalized.replace(/[,.-]/g, ' ')
  normalized = normalized.replace(/\s+/g, ' ')
  normalized = normalized.trim()
  
  // Common country abbreviations and variations
  const countryMappings: { [key: string]: string[] } = {
    'united states': ['usa', 'us', 'united states of america'],
    'india': ['in', 'ind', 'bharat'],
    'united kingdom': ['uk', 'gb', 'great britain', 'britain'],
    'canada': ['ca', 'can'],
    'australia': ['au', 'aus'],
    'germany': ['de', 'deutschland'],
    'france': ['fr', 'fra'],
    'italy': ['it', 'ita'],
    'spain': ['es', 'esp'],
    'japan': ['jp', 'jpn'],
    'china': ['cn', 'chn'],
    'brazil': ['br', 'bra'],
    'mexico': ['mx', 'mex'],
    'russia': ['ru', 'rus'],
    'south africa': ['za', 'rsa']
  }
  
  // US state abbreviations
  const stateAbbreviations: { [key: string]: string } = {
    'al': 'alabama', 'ak': 'alaska', 'az': 'arizona', 'ar': 'arkansas', 'ca': 'california',
    'co': 'colorado', 'ct': 'connecticut', 'de': 'delaware', 'fl': 'florida', 'ga': 'georgia',
    'hi': 'hawaii', 'id': 'idaho', 'il': 'illinois', 'in': 'indiana', 'ia': 'iowa',
    'ks': 'kansas', 'ky': 'kentucky', 'la': 'louisiana', 'me': 'maine', 'md': 'maryland',
    'ma': 'massachusetts', 'mi': 'michigan', 'mn': 'minnesota', 'ms': 'mississippi', 'mo': 'missouri',
    'mt': 'montana', 'ne': 'nebraska', 'nv': 'nevada', 'nh': 'new hampshire', 'nj': 'new jersey',
    'nm': 'new mexico', 'ny': 'new york', 'nc': 'north carolina', 'nd': 'north dakota', 'oh': 'ohio',
    'ok': 'oklahoma', 'or': 'oregon', 'pa': 'pennsylvania', 'ri': 'rhode island', 'sc': 'south carolina',
    'sd': 'south dakota', 'tn': 'tennessee', 'tx': 'texas', 'ut': 'utah', 'vt': 'vermont',
    'va': 'virginia', 'wa': 'washington', 'wv': 'west virginia', 'wi': 'wisconsin', 'wy': 'wyoming',
    'dc': 'district of columbia'
  }
  
  // Indian state abbreviations
  const indianStates: { [key: string]: string } = {
    'ap': 'andhra pradesh', 'ar': 'arunachal pradesh', 'as': 'assam', 'br': 'bihar',
    'ct': 'chhattisgarh', 'ga': 'goa', 'gj': 'gujarat', 'hr': 'haryana', 'hp': 'himachal pradesh',
    'jh': 'jharkhand', 'ka': 'karnataka', 'kl': 'kerala', 'mp': 'madhya pradesh', 'mh': 'maharashtra',
    'mn': 'manipur', 'ml': 'meghalaya', 'mz': 'mizoram', 'nl': 'nagaland', 'or': 'odisha',
    'pb': 'punjab', 'rj': 'rajasthan', 'sk': 'sikkim', 'tn': 'tamil nadu', 'tg': 'telangana',
    'tr': 'tripura', 'up': 'uttar pradesh', 'ut': 'uttarakhand', 'wb': 'west bengal'
  }
  
  // Replace abbreviations with full names and vice versa
  const words = normalized.split(' ')
  const expandedWords: string[] = []
  
  for (const word of words) {
    let expanded = false
    
    // Check country mappings
    for (const [fullName, abbreviations] of Object.entries(countryMappings)) {
      if (abbreviations.includes(word) || word === fullName) {
        expandedWords.push(fullName)
        // Also add all abbreviations for comprehensive matching
        expandedWords.push(...abbreviations)
        expanded = true
        break
      }
    }
    
    if (!expanded) {
      // Check US state abbreviations
      if (stateAbbreviations[word]) {
        expandedWords.push(stateAbbreviations[word])
        expandedWords.push(word) // Keep the abbreviation too
        expanded = true
      } else {
        // Check reverse mapping for US states
        const stateAbbrev = Object.keys(stateAbbreviations).find(
          abbrev => stateAbbreviations[abbrev] === word
        )
        if (stateAbbrev) {
          expandedWords.push(word)
          expandedWords.push(stateAbbrev)
          expanded = true
        }
      }
    }
    
    if (!expanded) {
      // Check Indian state abbreviations
      if (indianStates[word]) {
        expandedWords.push(indianStates[word])
        expandedWords.push(word)
        expanded = true
      } else {
        // Check reverse mapping for Indian states
        const indianStateAbbrev = Object.keys(indianStates).find(
          abbrev => indianStates[abbrev] === word
        )
        if (indianStateAbbrev) {
          expandedWords.push(word)
          expandedWords.push(indianStateAbbrev)
          expanded = true
        }
      }
    }
    
    if (!expanded) {
      expandedWords.push(word)
    }
  }
  
  // Remove duplicates and join
  const uniqueWords = [...new Set(expandedWords)]
  return uniqueWords.join(' ')
}

/**
 * Check if two location strings match using flexible comparison
 */
export function locationsMatch(location1: string, location2: string): boolean {
  if (!location1 || !location2) return false
  
  const normalized1 = normalizeLocationString(location1)
  const normalized2 = normalizeLocationString(location2)
  
  // Check bidirectional includes
  return normalized1.includes(normalized2) || normalized2.includes(normalized1)
}