export interface SentimentResult {
  score: number
  magnitude: number
  label: 'positive' | 'negative' | 'neutral'
  confidence: number
  emotions: EmotionScore[]
  keywords: KeywordSentiment[]
}

export interface EmotionScore {
  emotion: string
  score: number
  intensity: 'low' | 'medium' | 'high'
}

export interface KeywordSentiment {
  keyword: string
  sentiment: number
  context: string
}

export class SentimentAnalyzer {
  private static readonly POSITIVE_WORDS = [
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'outstanding',
    'perfect', 'brilliant', 'superb', 'terrific', 'awesome', 'incredible', 'marvelous',
    'satisfied', 'happy', 'pleased', 'delighted', 'thrilled', 'excited', 'joyful',
    'successful', 'achievement', 'accomplishment', 'victory', 'win', 'triumph',
    'improve', 'enhance', 'upgrade', 'better', 'best', 'optimal', 'efficient',
    'effective', 'productive', 'profitable', 'beneficial', 'valuable', 'worthwhile'
  ]

  private static readonly NEGATIVE_WORDS = [
    'bad', 'terrible', 'awful', 'horrible', 'dreadful', 'atrocious', 'abysmal',
    'poor', 'inferior', 'substandard', 'unsatisfactory', 'disappointing', 'frustrating',
    'angry', 'upset', 'sad', 'depressed', 'anxious', 'worried', 'stressed',
    'failed', 'failure', 'defeat', 'loss', 'problem', 'issue', 'trouble',
    'difficult', 'challenging', 'complicated', 'complex', 'confusing', 'unclear',
    'expensive', 'costly', 'overpriced', 'waste', 'useless', 'pointless', 'meaningless'
  ]

  private static readonly EMOTION_WORDS = {
    joy: ['happy', 'joyful', 'excited', 'thrilled', 'delighted', 'ecstatic', 'elated'],
    sadness: ['sad', 'depressed', 'melancholy', 'sorrowful', 'grief', 'despair', 'hopeless'],
    anger: ['angry', 'furious', 'enraged', 'irritated', 'annoyed', 'frustrated', 'mad'],
    fear: ['afraid', 'scared', 'terrified', 'anxious', 'worried', 'nervous', 'panicked'],
    surprise: ['surprised', 'shocked', 'amazed', 'astonished', 'stunned', 'bewildered'],
    disgust: ['disgusted', 'revolted', 'repulsed', 'appalled', 'horrified', 'sickened'],
    trust: ['trusting', 'confident', 'assured', 'certain', 'secure', 'reliable'],
    anticipation: ['eager', 'enthusiastic', 'hopeful', 'optimistic', 'expectant']
  }

  /**
   * Analyze sentiment of text
   */
  static analyzeSentiment(text: string): SentimentResult {
    const words = text.toLowerCase().split(/\s+/)
    const wordCount = words.length
    
    if (wordCount === 0) {
      return this.getNeutralResult()
    }
    
    let positiveScore = 0
    let negativeScore = 0
    let emotionScores: { [key: string]: number } = {}
    
    // Count positive and negative words
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '')
      
      if (this.POSITIVE_WORDS.includes(cleanWord)) {
        positiveScore++
      } else if (this.NEGATIVE_WORDS.includes(cleanWord)) {
        negativeScore++
      }
      
      // Count emotion words
      Object.entries(this.EMOTION_WORDS).forEach(([emotion, emotionWords]) => {
        if (emotionWords.includes(cleanWord)) {
          emotionScores[emotion] = (emotionScores[emotion] || 0) + 1
        }
      })
    })
    
    // Calculate sentiment score (-1 to 1)
    const sentimentScore = (positiveScore - negativeScore) / wordCount
    
    // Calculate magnitude (0 to 1)
    const magnitude = Math.abs(sentimentScore)
    
    // Determine label
    let label: 'positive' | 'negative' | 'neutral'
    if (sentimentScore > 0.1) {
      label = 'positive'
    } else if (sentimentScore < -0.1) {
      label = 'negative'
    } else {
      label = 'neutral'
    }
    
    // Calculate confidence
    const confidence = Math.min(0.95, 0.5 + magnitude * 0.45)
    
    // Process emotion scores
    const emotions: EmotionScore[] = Object.entries(emotionScores)
      .map(([emotion, score]) => ({
        emotion,
        score: score / wordCount,
        intensity: this.getIntensity(score / wordCount)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
    
    // Extract keyword sentiment
    const keywords = this.extractKeywordSentiment(text, words)
    
    return {
      score: sentimentScore,
      magnitude,
      label,
      confidence,
      emotions,
      keywords
    }
  }

  /**
   * Get intensity level for emotion score
   */
  private static getIntensity(score: number): 'low' | 'medium' | 'high' {
    if (score < 0.01) return 'low'
    if (score < 0.05) return 'medium'
    return 'high'
  }

  /**
   * Extract keyword sentiment
   */
  private static extractKeywordSentiment(text: string, words: string[]): KeywordSentiment[] {
    const keywordSentiment: KeywordSentiment[] = []
    
    // Find words that appear multiple times
    const wordFreq: { [key: string]: number } = {}
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '')
      if (cleanWord.length > 3) {
        wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1
      }
    })
    
    // Calculate sentiment for frequent words
    Object.entries(wordFreq)
      .filter(([, freq]) => freq > 1)
      .forEach(([word, freq]) => {
        let sentiment = 0
        
        if (this.POSITIVE_WORDS.includes(word)) {
          sentiment = 0.5
        } else if (this.NEGATIVE_WORDS.includes(word)) {
          sentiment = -0.5
        }
        
        if (sentiment !== 0) {
          keywordSentiment.push({
            keyword: word,
            sentiment: sentiment * Math.min(1, freq / 5), // Cap at 5 occurrences
            context: `Appears ${freq} times`
          })
        }
      })
    
    return keywordSentiment
      .sort((a, b) => Math.abs(b.sentiment) - Math.abs(a.sentiment))
      .slice(0, 10)
  }

  /**
   * Detect sensitive content
   */
  static detectSensitivity(text: string): 'low' | 'medium' | 'high' {
    const sensitivePatterns = [
      // Financial information
      /\b(?:ssn|social\s+security|credit\s+card|bank\s+account|routing\s+number)\b/gi,
      // Personal information
      /\b(?:birth\s+date|birthday|address|phone|email|password|pin)\b/gi,
      // Legal terms
      /\b(?:confidential|secret|classified|private|restricted|proprietary)\b/gi,
      // Negative sentiment indicators
      /\b(?:complaint|grievance|dispute|conflict|problem|issue|concern)\b/gi
    ]
    
    let sensitivityScore = 0
    
    sensitivePatterns.forEach(pattern => {
      const matches = text.match(pattern)
      if (matches) {
        sensitivityScore += matches.length
      }
    })
    
    if (sensitivityScore === 0) return 'low'
    if (sensitivityScore < 3) return 'medium'
    return 'high'
  }

  /**
   * Generate recommendations based on sentiment
   */
  static generateRecommendations(sentiment: SentimentResult, sensitivity: 'low' | 'medium' | 'high'): string[] {
    const recommendations: string[] = []
    
    // Sentiment-based recommendations
    if (sentiment.label === 'negative') {
      recommendations.push('Consider addressing concerns mentioned in the document')
      recommendations.push('Review tone and language for improvement opportunities')
    } else if (sentiment.label === 'positive') {
      recommendations.push('Document shows positive sentiment and engagement')
      recommendations.push('Consider highlighting successful aspects')
    }
    
    // Sensitivity-based recommendations
    if (sensitivity === 'high') {
      recommendations.push('Document contains sensitive information - review carefully')
      recommendations.push('Consider redacting personal or confidential details')
    } else if (sensitivity === 'medium') {
      recommendations.push('Document contains some sensitive content - review recommended')
    }
    
    // Emotion-based recommendations
    if (sentiment.emotions.length > 0) {
      const topEmotion = sentiment.emotions[0]
      if (topEmotion.intensity === 'high') {
        recommendations.push(`High ${topEmotion.emotion} detected - consider emotional impact`)
      }
    }
    
    return recommendations
  }

  /**
   * Get neutral sentiment result
   */
  private static getNeutralResult(): SentimentResult {
    return {
      score: 0,
      magnitude: 0,
      label: 'neutral',
      confidence: 0.5,
      emotions: [],
      keywords: []
    }
  }
}
