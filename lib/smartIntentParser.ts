export interface IntentResult {
  intent: 'document_search' | 'calendar_search' | 'employee_search'
  confidence: number
  keywords: string[]
  reason: string
}

export class SmartIntentParser {
  // Keywords for calendar-related intents
  private static readonly CALENDAR_KEYWORDS = [
    'schedule', 'scheduled', 'scheduling',
    'interview', 'interviews', 'interviewing',
    'meeting', 'meetings',
    'appointment', 'appointments',
    'calendar', 'calendars',
    'when is', 'when are',
    'what time', 'what day',
    'book', 'booking', 'reserve', 'reservation',
    'available', 'availability',
    'free time', 'open time',
    'today', 'tomorrow', 'this week', 'next week',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
    'saturday', 'sunday',
    'am', 'pm', 'morning', 'afternoon', 'evening'
  ]

  // Keywords for employee-related intents
  private static readonly EMPLOYEE_KEYWORDS = [
    'employee', 'employees', 'staff', 'team',
    'who is', 'who are',
    'contact', 'contacts', 'phone', 'email',
    'department', 'departments',
    'manager', 'managers', 'supervisor', 'supervisors',
    'engineer', 'engineers', 'developer', 'developers',
    'designer', 'designers', 'analyst', 'analysts',
    'hr', 'human resources', 'marketing', 'sales',
    'finance', 'operations', 'it', 'support',
    'hire', 'hired', 'hiring', 'new employee',
    'employee list', 'staff list', 'team members',
    'directory', 'phonebook', 'contact list'
  ]

  // Common names that might indicate employee search
  private static readonly COMMON_NAMES = [
    'john', 'jane', 'michael', 'sarah', 'david', 'lisa', 'chris', 'emily',
    'mike', 'jennifer', 'robert', 'amanda', 'james', 'jessica', 'william',
    'ashley', 'richard', 'michelle', 'thomas', 'kimberly', 'charles', 'samantha',
    'daniel', 'stephanie', 'matthew', 'nicole', 'anthony', 'elizabeth', 'mark',
    'helen', 'donald', 'deborah', 'steven', 'dorothy', 'paul', 'lisa', 'andrew',
    'nancy', 'joshua', 'karen', 'kenneth', 'betty', 'kevin', 'helen', 'brian',
    'sandra', 'george', 'donna', 'timothy', 'carol', 'ronald', 'ruth', 'jason'
  ]

  /**
   * Parse user query to determine intent
   */
  static parseIntent(query: string): IntentResult {
    if (!query || query.trim().length === 0) {
      return {
        intent: 'document_search',
        confidence: 0,
        keywords: [],
        reason: 'Empty query, defaulting to document search'
      }
    }

    const normalizedQuery = query.toLowerCase().trim()
    const words = normalizedQuery.split(/\s+/)

    // Check for calendar intent
    const calendarScore = this.calculateCalendarScore(words, normalizedQuery)
    if (calendarScore > 0.6) {
      return {
        intent: 'calendar_search',
        confidence: calendarScore,
        keywords: this.extractKeywords(words, this.CALENDAR_KEYWORDS),
        reason: 'Query contains calendar/scheduling keywords'
      }
    }

    // Check for employee intent
    const employeeScore = this.calculateEmployeeScore(words, normalizedQuery)
    if (employeeScore > 0.5) {
      return {
        intent: 'employee_search',
        confidence: employeeScore,
        keywords: this.extractKeywords(words, this.EMPLOYEE_KEYWORDS),
        reason: 'Query contains employee/staff keywords or names'
      }
    }

    // Default to document search
    return {
      intent: 'document_search',
      confidence: 0.8,
      keywords: [],
      reason: 'Query appears to be document-related by default'
    }
  }

  /**
   * Calculate calendar intent score
   */
  private static calculateCalendarScore(words: string[], query: string): number {
    let score = 0
    let matches = 0

    // Check for calendar keywords
    for (const word of words) {
      if (this.CALENDAR_KEYWORDS.includes(word)) {
        score += 1
        matches++
      }
    }

    // Check for time patterns
    const timePatterns = [
      /\d{1,2}:\d{2}/, // HH:MM format
      /\d{1,2}\s*(am|pm)/i, // 3pm, 10 am
      /(today|tomorrow|yesterday)/i,
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /(january|february|march|april|may|june|july|august|september|october|november|december)/i
    ]

    for (const pattern of timePatterns) {
      if (pattern.test(query)) {
        score += 0.5
        matches++
      }
    }

    // Normalize score
    return Math.min(score / Math.max(words.length * 0.3, 1), 1)
  }

  /**
   * Calculate employee intent score
   */
  private static calculateEmployeeScore(words: string[], query: string): number {
    let score = 0
    let matches = 0

    // Check for employee keywords
    for (const word of words) {
      if (this.EMPLOYEE_KEYWORDS.includes(word)) {
        score += 1
        matches++
      }
    }

    // Check for common names (potential employee names)
    for (const word of words) {
      if (this.COMMON_NAMES.includes(word.toLowerCase())) {
        score += 0.8
        matches++
      }
    }

    // Check for "who" questions
    if (query.startsWith('who is') || query.startsWith('who are')) {
      score += 0.7
      matches++
    }

    // Check for contact-related patterns
    const contactPatterns = [
      /phone\s*(number)?/i,
      /email\s*(address)?/i,
      /contact\s*(info|information)?/i,
      /how\s*to\s*reach/i,
      /get\s*in\s*touch/i
    ]

    for (const pattern of contactPatterns) {
      if (pattern.test(query)) {
        score += 0.6
        matches++
      }
    }

    // Normalize score
    return Math.min(score / Math.max(words.length * 0.3, 1), 1)
  }

  /**
   * Extract matched keywords
   */
  private static extractKeywords(words: string[], keywordList: string[]): string[] {
    return words.filter(word => keywordList.includes(word.toLowerCase()))
  }

  /**
   * Get examples for each intent type
   */
  static getIntentExamples(): Record<string, string[]> {
    return {
      document_search: [
        'Find information about company policies',
        'What does the employee handbook say about vacation?',
        'Search for documents about benefits',
        'Show me the latest company updates',
        'Find all documents related to onboarding'
      ],
      calendar_search: [
        'Schedule an interview for tomorrow',
        'When is the next team meeting?',
        'What interviews do I have this week?',
        'Book a room for 2pm today',
        'Show me my calendar for next Monday'
      ],
      employee_search: [
        'Who is the HR manager?',
        'Find contact information for John Smith',
        'List all employees in the engineering department',
        'Who works in marketing?',
        'Show me the employee directory'
      ]
    }
  }
}
